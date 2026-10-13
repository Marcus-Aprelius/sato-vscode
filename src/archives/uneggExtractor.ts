import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { extractUneggArchive } from "./uneggCli";
import { applyExtractionMetadata, readExtractionMetadata } from "./extractionMetadata";
import { inspectArchiveSecurity, resolveSafeExtractionPath } from "./security";

import type { ArchiveInspection } from "./types";
import type { ZipExtractionResult } from "./zipExtractor";

export async function extractAlzEggArchive(
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

    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-unegg-"));

    try {
        await extractUneggArchive(archivePath, temporaryDirectory, password);
        return copySelectedFiles(temporaryDirectory, destinationDirectory, selectedPaths);

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function copySelectedFiles(
    sourceDirectory: string,
    destinationDirectory: string,
    selectedPaths?: ReadonlySet<string>
): Promise<ZipExtractionResult> {
    const metadata = await readExtractionMetadata(destinationDirectory);
    await fs.promises.mkdir(destinationDirectory, {recursive: true});
    await applyExtractionMetadata(destinationDirectory, metadata, true);

    const extractedFiles: string[] = [];
    const skippedEntries: string[] = [];

    const walk = async (currentDirectory: string): Promise<void> => {
        const entries = await fs.promises.readdir(currentDirectory, {withFileTypes: true});

        for (const entry of entries) {
            const sourcePath = path.join(currentDirectory, entry.name);
            const relativePath = path.relative(sourceDirectory, sourcePath).replace(/\\/g, "/");

            if (entry.isSymbolicLink()) {
                skippedEntries.push(relativePath);
                continue;
            }

            if (entry.isDirectory()) {
                await walk(sourcePath);
                continue;
            }

            if (!entry.isFile()) {
                skippedEntries.push(relativePath);
                continue;
            }

            if (selectedPaths && !selectedPaths.has(relativePath)) {
                skippedEntries.push(relativePath);
                continue;
            }

            const destinationPath = resolveSafeExtractionPath(destinationDirectory, relativePath);
            await fs.promises.mkdir(path.dirname(destinationPath), {recursive: true});

            if (await pathExists(destinationPath)) {
                throw new Error(`Destination file already exists: ${destinationPath}`);
            }

            await fs.promises.copyFile(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
            await applyExtractionMetadata(destinationPath, metadata, false);
            extractedFiles.push(destinationPath);
        }
    };

    await walk(sourceDirectory);

    return {
        destinationDirectory: path.resolve(destinationDirectory),
        extractedFiles,
        skippedEntries
    };
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
