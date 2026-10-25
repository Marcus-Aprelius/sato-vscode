import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runSevenZip, normalizeSevenZipError } from "./sevenZipCli";
import { inspectArchiveSecurity } from "./security";
import { readExtractionMetadata, applyExtractionMetadata } from "./extractionMetadata";
import { compoundTarFileName, isCompoundTarFormat } from "./compoundTar";

import type { ArchiveInspection } from "./types";
import type { ZipExtractionResult } from "./zipExtractor";

export async function extractSevenZipArchive(
    archivePath: string,
    inspection: ArchiveInspection,
    destinationDirectory: string,
    password?: string,
    selectedPaths?: ReadonlySet<string>
): Promise<ZipExtractionResult> {
    const selectedEntries = inspection.entries.filter(entry => !selectedPaths || selectedPaths.has(entry.path));
    const security = inspectArchiveSecurity(selectedEntries);

    if (!security.safe) {
        throw new Error(["Archive extraction was blocked.", ...security.warnings].join("\n"));
    }

    if (isCompoundTarFormat(inspection.format)) {
        return extractCompoundTarArchive(archivePath, inspection, destinationDirectory, password, selectedPaths);
    }

    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-7z-extract-"));

    try {
        const args = ["x", archivePath, `-o${temporaryDirectory}`, "-y", "-bd", "-bso1", "-bse1"];

        if (password !== undefined) {
            args.push(`-p${password}`);
        } else if (inspection.format !== "rpm" && inspection.format !== "cpio") {
            args.push("-p-");
        }

        if (selectedPaths) {
            for (const selectedPath of selectedPaths) {
                args.push(selectedPath);
            }
        }

        const result = await runSevenZip(args);

        if (result.exitCode !== 0) {
            throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
        }

        return await copyExtractedFiles(temporaryDirectory, destinationDirectory);

    } finally {
        await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    }
}

async function copyExtractedFiles(
    sourceDirectory: string,
    destinationDirectory: string
): Promise<ZipExtractionResult> {
    const extractionMetadata = await readExtractionMetadata(destinationDirectory);
    await fs.promises.mkdir(destinationDirectory, {recursive: true});
    await applyExtractionMetadata(destinationDirectory, extractionMetadata, true);

    const extractedFiles: string[] = [];
    await copyDirectoryContents(sourceDirectory, destinationDirectory, extractionMetadata, extractedFiles);

    return {
        destinationDirectory: path.resolve(destinationDirectory),
        extractedFiles, skippedEntries: []
    };
}

async function copyDirectoryContents(
    sourceDirectory: string,
    destinationDirectory: string,
    extractionMetadata: Awaited<ReturnType<typeof readExtractionMetadata>>,
    extractedFiles: string[]
): Promise<void> {
    const entries = await fs.promises.readdir(sourceDirectory, {withFileTypes: true});

    for (const entry of entries) {
        const sourcePath = path.join(sourceDirectory, entry.name);
        const destinationPath = path.join(destinationDirectory, entry.name);

        if (entry.isSymbolicLink()) {
            throw new Error(`Symbolic links are not extracted: ${entry.name}`);
        }

        if (entry.isDirectory()) {
            await fs.promises.mkdir(destinationPath, {recursive: true});
            await applyExtractionMetadata(destinationPath, extractionMetadata, true);
            await copyDirectoryContents(sourcePath, destinationPath, extractionMetadata, extractedFiles);

            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        if (await pathExists(destinationPath)) {
            throw new Error(`Destination file already exists: ${destinationPath}`);
        }

        await fs.promises.copyFile(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
        await applyExtractionMetadata(destinationPath, extractionMetadata, false);
        extractedFiles.push(destinationPath);
    }
}

async function pathExists(
    filePath: string
): Promise<boolean> {
    try {
        await fs.promises.access(filePath);
        return true;

    } catch {
        return false;
    }
}

async function extractCompoundTarArchive(
    archivePath: string,
    inspection: ArchiveInspection,
    destinationDirectory: string,
    password?: string,
    selectedPaths?: ReadonlySet<string>
): Promise<ZipExtractionResult> {
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-compound-tar-"));

    try {
        const args = ["x", archivePath, `-o${temporaryDirectory}`, "-y", "-bd", "-bso1", "-bse1", password !== undefined ? `-p${password}` : "-p-"];
        const result = await runSevenZip(args);

        if (result.exitCode !== 0) {
            throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
        }

        const expectedPath = path.join(temporaryDirectory, compoundTarFileName(archivePath));
        const innerTarPath = await findExtractedTar(temporaryDirectory, expectedPath);
        const resolvedSelectedPaths = selectedPaths ? await resolveSelectedTarPaths(innerTarPath,selectedPaths): undefined;

        return await extractSevenZipArchive(
            innerTarPath,
            {
                ...inspection,
                fileName: path.basename(innerTarPath),
                filePath: innerTarPath,
                format: "tar"
            },
            destinationDirectory,
            undefined,
            resolvedSelectedPaths
        );

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function resolveSelectedTarPaths(
    tarPath: string,
    selectedPaths: ReadonlySet<string>
): Promise<Set<string>> {
    const result = await runSevenZip(["l", "-slt", "-ba", "-bd", tarPath, "-p-"]);

    if (result.exitCode !== 0) {
        throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
    }

    const availablePaths = collectArchivePaths(result.stdout);
    const resolvedPaths = new Set<string>();

    for (const selectedPath of selectedPaths) {
        const normalizedPath = selectedPath.replace(/\\/g, "/").replace(/^\.?\/*/, "").replace(/\/+$/, "");

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
            `Archive entry was not found: ${selectedPath}`
        );
    }

    return resolvedPaths;
}

function collectArchivePaths(
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

async function findExtractedTar(
    directory: string,
    expectedPath: string
): Promise<string> {
    try {
        const stat = await fs.promises.stat(expectedPath);

        if (stat.isFile()) {
            return expectedPath;
        }

    } catch {
        // Search below.
    }

    const entries = await fs.promises.readdir(directory, {withFileTypes: true});
    const tarEntry = entries.find(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".tar"));

    if (!tarEntry) {
        throw new Error("The compressed archive did not contain an inner TAR file.");
    }

    return path.join(directory, tarEntry.name);
}
