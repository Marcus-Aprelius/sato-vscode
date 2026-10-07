import * as fs from "fs";
import * as path from "path";

import { resolveSafeExtractionPath } from "./security";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";
import { applyExtractionMetadata, readExtractionMetadata } from "./extractionMetadata";

import type { FileEntry } from "@zip.js/zip.js";
import type { ZipExtractionResult } from "./zipExtractor";

const MAX_ENCRYPTED_ENTRY_SIZE = 256 * 1024 * 1024;

export async function extractEncryptedZipArchive(
    archivePath: string,
    destinationDirectory: string,
    password: string,
    selectedPaths?: ReadonlySet<string>
): Promise<ZipExtractionResult> {
    if (!password) {
        throw new Error("Archive password is required.");
    }

    const archiveBytes = await fs.promises.readFile(archivePath);
    const zipReader = new ZipReader(new Uint8ArrayReader(archiveBytes));
    const extractedFiles: string[] = [];
    const skippedEntries: string[] = [];
    const extractionMetadata = await readExtractionMetadata(destinationDirectory);

    try {
        const entries = await zipReader.getEntries();
        await fs.promises.mkdir(destinationDirectory, {recursive: true});
        await applyExtractionMetadata(destinationDirectory, extractionMetadata, true);

        for (const entry of entries) {
            if (selectedPaths && !selectedPaths.has(entry.filename)) {
                skippedEntries.push(entry.filename);
                continue;
            }

            const destinationPath = resolveSafeExtractionPath(destinationDirectory, entry.filename);

            if (entry.directory) {
                await fs.promises.mkdir(destinationPath, {recursive: true});
                await applyExtractionMetadata(destinationPath, extractionMetadata, true);

                continue;
            }

            if (entry.uncompressedSize > MAX_ENCRYPTED_ENTRY_SIZE) {
                throw new Error(`Archive entry is too large: ` + `${entry.filename}`);
            }

            if (await pathExists(destinationPath)) {
                throw new Error(`Destination file already exists: ` + destinationPath);
            }

            await fs.promises.mkdir(path.dirname(destinationPath), {recursive: true});
            await applyExtractionMetadata(path.dirname(destinationPath), extractionMetadata, true);
            await extractEncryptedEntry(entry, destinationPath, password);
            await applyExtractionMetadata(destinationPath, extractionMetadata, false);

            extractedFiles.push(destinationPath);
        }

        return {
            destinationDirectory: path.resolve(destinationDirectory),
            extractedFiles,
            skippedEntries
        };

    } finally {
        await zipReader.close();
    }
}

async function extractEncryptedEntry(
    entry: FileEntry,
    destinationPath: string,
    password: string
): Promise<void> {
    try {
        const bytes = await entry.getData(new Uint8ArrayWriter(), {password, checkAuthenticationCode: true, checkCrc32: true});
        await fs.promises.writeFile(destinationPath, bytes, {flag: "wx", mode: 0o600});

    } catch (error) {
        await fs.promises.unlink(destinationPath).catch(() => undefined);

        throw error;
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
