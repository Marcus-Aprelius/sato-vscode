import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { extractRpmCpioPayload } from "./rpmPayload";
import { extractSevenZipArchive } from "./sevenZipExtractor";
import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";

import type { ArchiveEntry, ArchiveInspection } from "./types";
import type { ZipExtractionResult } from "./zipExtractor";

export async function extractRpmPackage(
    packagePath: string,
    inspection: ArchiveInspection,
    destinationDirectory: string,
    selectedPaths?: ReadonlySet<string>
): Promise<ZipExtractionResult> {
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-rpm-extract-"));

    try {
        const cpioPath = await extractRpmCpioPayload(packagePath, temporaryDirectory);
        const payloadEntries = inspection.entries.filter(entry => entry.path.startsWith("Payload/")).map(entry => stripPayloadPrefix(entry));
        const payloadSelection = selectedPaths ? stripSelectedPayloadPrefix(selectedPaths) : undefined;

        if (selectedPaths && payloadSelection?.size === 0) {
            return {
                destinationDirectory: path.resolve(destinationDirectory),
                extractedFiles: [],
                skippedEntries: []
            };
        }

        const nestedInspection: ArchiveInspection = {
            fileName: path.basename(cpioPath),
            filePath: cpioPath,
            format: "rpm",
            encrypted: false,
            fileSize: (await fs.promises.stat(cpioPath)).size,
            entryCount: payloadEntries.length,
            totalUncompressedSize: payloadEntries.reduce((total, entry) => total + entry.uncompressedSize, 0),
            entries: payloadEntries,
            warnings: []
        };
        const resolvedPayloadSelection = payloadSelection ? await resolveCpioPaths(cpioPath, payloadSelection) : undefined;

        return await extractSevenZipArchive(
            cpioPath,
            nestedInspection,
            path.join(destinationDirectory, "Payload"),
            undefined,
            resolvedPayloadSelection
        );

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function resolveCpioPaths(
    cpioPath: string,
    selectedPaths: ReadonlySet<string>
): Promise<Set<string>> {
    const result = await runSevenZip(["l", "-slt", "-ba", "-bd", cpioPath]);

    if (result.exitCode !== 0) {
        throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
    }

    const availablePaths = collectCpioPaths(result.stdout);
    const resolvedPaths = new Set<string>();

    for (const selectedPath of selectedPaths) {
        const normalizedPath = normalizeEntryPath(selectedPath);

        if (availablePaths.has(normalizedPath)) {
            resolvedPaths.add(normalizedPath);
            continue;
        }

        const dotPrefixedPath = `./${normalizedPath}`;

        if (availablePaths.has(dotPrefixedPath)) {
            resolvedPaths.add(dotPrefixedPath);
            continue;
        }

        throw new Error(
            `RPM package entry was not found: ${selectedPath}`
        );
    }

    return resolvedPaths;
}

function collectCpioPaths(
    output: string
): Set<string> {
    const paths = new Set<string>();

    for (const line of output.replace(/\r/g, "").split("\n")) {
        const match = line.match(/^Path = (.+)$/);

        if (!match?.[1]) {
            continue;
        }

        paths.add(match[1].replace(/\\/g, "/").replace(/\/+$/, ""));
    }

    return paths;
}

function stripSelectedPayloadPrefix(
    selectedPaths: ReadonlySet<string>
): Set<string> {
    const result = new Set<string>();

    for (const selectedPath of selectedPaths) {
        const normalizedPath = normalizeEntryPath(selectedPath);

        if (normalizedPath === "Payload") {
            continue;
        }

        if (normalizedPath.startsWith("Payload/")) {
            result.add(normalizedPath.slice("Payload/".length));
        }
    }

    return result;
}

function stripPayloadPrefix(
    entry: ArchiveEntry
): ArchiveEntry {
    const normalizedPath = normalizeEntryPath(entry.path);
    return {...entry, path: normalizedPath.startsWith("Payload/") ? normalizedPath.slice("Payload/".length) : normalizedPath};
}

function normalizeEntryPath(
    entryPath: string
): string {
    return entryPath.replace(/\\/g, "/").replace(/^\.?\/*/, "").replace(/\/+$/, "");
}
