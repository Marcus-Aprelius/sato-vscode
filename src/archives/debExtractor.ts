import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { detectArchiveFormat } from "./format";
import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";
import { extractSevenZipArchive } from "./sevenZipExtractor";

import type { ArchiveEntry, ArchiveFormat, ArchiveInspection} from "./types";
import type { ZipExtractionResult } from "./zipExtractor";

export async function extractDebPackage(
    packagePath: string,
    inspection: ArchiveInspection,
    destinationDirectory: string,
    selectedPaths?: ReadonlySet<string>
): Promise<ZipExtractionResult> {
    const temporaryDirectory = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), "sato-deb-extract-")
    );

    try {
        await extractDebContainer(packagePath, temporaryDirectory);

        const controlArchivePath = await findDebMember(temporaryDirectory, "control.tar");
        const dataArchivePath = await findDebMember(temporaryDirectory, "data.tar");

        if (!controlArchivePath) {
            throw new Error("The DEB package does not contain a control.tar archive.");
        }

        if (!dataArchivePath) {
            throw new Error("The DEB package does not contain a data.tar archive.");
        }

        const controlSelection = selectedPaths ? stripSelectedPrefix(selectedPaths, "Control") : new Set<string>();
        const payloadSelection = selectedPaths ? stripSelectedPrefix(selectedPaths, "Payload") : new Set<string>();

        const extractAll = selectedPaths === undefined;
        const extractedFiles: string[] = [];
        const skippedEntries: string[] = [];

        if (extractAll || controlSelection.size > 0) {
            const controlResult = await extractDebMember(controlArchivePath, inspection, "Control", path.join(destinationDirectory, "Control"), extractAll
                ? undefined : controlSelection
            );

            extractedFiles.push(...controlResult.extractedFiles);
            skippedEntries.push(...controlResult.skippedEntries);
        }

        if (extractAll || payloadSelection.size > 0) {
            const payloadResult = await extractDebMember(dataArchivePath, inspection, "Payload", path.join(destinationDirectory, "Payload"), extractAll
                ? undefined : payloadSelection
            );

            extractedFiles.push(...payloadResult.extractedFiles);
            skippedEntries.push(...payloadResult.skippedEntries);
        }

        return {destinationDirectory: path.resolve(destinationDirectory), extractedFiles, skippedEntries};

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function extractDebContainer(
    packagePath: string,
    destinationDirectory: string
): Promise<void> {
    const result = await runSevenZip(["x", "-tAr", packagePath, `-o${destinationDirectory}`, "-y", "-bd", "-bso1", "-bse1", "-p-" ]);

    if (result.exitCode === 0) {
        return;
    }

    throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
}

async function extractDebMember(
    archivePath: string,
    packageInspection: ArchiveInspection,
    prefix: "Control" | "Payload",
    destinationDirectory: string,
    selectedPaths?: ReadonlySet<string>
): Promise<ZipExtractionResult> {
    const format = detectArchiveFormat(archivePath);

    if (!format || !isTarFormat(format)) {
        throw new Error(`Unsupported DEB member format: ${path.basename(archivePath)}`);
    }

    const entries = packageInspection.entries.filter(entry => entry.path.startsWith(`${prefix}/`)).map(entry => stripEntryPrefix(entry, prefix));

    const nestedInspection: ArchiveInspection = {
        fileName: path.basename(archivePath),
        filePath: archivePath,
        format,
        encrypted: false,
        fileSize: (await fs.promises.stat(archivePath)).size,
        entryCount: entries.length,
        totalUncompressedSize: entries.reduce((total, entry) => total + entry.uncompressedSize, 0),
        entries,
        warnings: []
    };

    return extractSevenZipArchive(
        archivePath,
        nestedInspection,
        destinationDirectory,
        undefined,
        selectedPaths
    );
}

async function findDebMember(
    directoryPath: string,
    baseName: string
): Promise<string | undefined> {
    const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true});

    const candidate = entries.find(entry => {
        if (!entry.isFile()) {
            return false;
        }

        const lowerName = entry.name.toLowerCase();
        return (lowerName === baseName || lowerName.startsWith(`${baseName}.`));
    });

    return candidate ? path.join(directoryPath, candidate.name) : undefined;
}

function stripSelectedPrefix(
    selectedPaths: ReadonlySet<string>,
    prefix: "Control" | "Payload"
): Set<string> {
    const result = new Set<string>();
    const prefixWithSeparator = `${prefix}/`;

    for (const selectedPath of selectedPaths) {
        const normalizedPath = normalizeEntryPath(selectedPath);

        if (normalizedPath === prefix) {
            continue;
        }

        if (normalizedPath.startsWith(prefixWithSeparator)) {
            result.add(normalizedPath.slice(prefixWithSeparator.length));
        }
    }

    return result;
}

function stripEntryPrefix(
    entry: ArchiveEntry,
    prefix: "Control" | "Payload"
): ArchiveEntry {
    const prefixWithSeparator = `${prefix}/`;
    const normalizedPath = normalizeEntryPath(entry.path);

    return {...entry, path: normalizedPath.startsWith(prefixWithSeparator) ? normalizedPath.slice(prefixWithSeparator.length) : normalizedPath};
}

function normalizeEntryPath(
    entryPath: string
): string {
    return entryPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function isTarFormat(
    format: ArchiveFormat
): format is "tar" | "tar-gzip" | "tar-bzip2" | "tar-xz" {
    return (format === "tar" || format === "tar-gzip" || format === "tar-bzip2" || format === "tar-xz");
}
