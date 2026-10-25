import * as fs from "fs";
import * as path from "path";
import { openAsBlob } from "fs";

import { resolveSafeExtractionPath } from "./security";
import { BlobReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";
import { applyExtractionMetadata, readExtractionMetadata } from "./extractionMetadata";
import { ARCHIVE_LIMITS, checkActualBytes, checkCompressionRatio, checkEntrySize } from "./limits";

import type { FileEntry } from "@zip.js/zip.js";
import type { ZipExtractionResult } from "./zipExtractor";

export async function extractEncryptedZipArchive(
    archivePath: string,
    destinationDirectory: string,
    password: string,
    selectedPaths?: ReadonlySet<string>
): Promise<ZipExtractionResult> {
    if (!password) {
        throw new Error("Archive password is required.");
    }

    const archiveBlob = await openAsBlob(archivePath);
    const zipReader = new ZipReader(new BlobReader(archiveBlob));
    const extractedFiles: string[] = [];
    const skippedEntries: string[] = [];
    const extractionProgress = {totalBytes: 0};
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

            checkEntrySize(entry.filename, entry.uncompressedSize);
            checkCompressionRatio(entry.filename, entry.compressedSize, entry.uncompressedSize);

            if (await pathExists(destinationPath)) {
                throw new Error(`Destination file already exists: ` + destinationPath);
            }

            await fs.promises.mkdir(path.dirname(destinationPath), {recursive: true});
            await applyExtractionMetadata(path.dirname(destinationPath), extractionMetadata, true);
            await extractEncryptedEntry(entry, destinationPath, password, extractionProgress);
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
    password: string,
    extractionProgress: {totalBytes: number;}
): Promise<void> {
    try {
        const bytes = await entry.getData(new Uint8ArrayWriter(), {password, checkAuthenticationCode: true, checkCrc32: true});
        checkActualBytes(entry.filename, bytes.length, Math.min(entry.uncompressedSize + 64 * 1024, ARCHIVE_LIMITS.maxEntrySize));
        extractionProgress.totalBytes += bytes.length;
        checkActualBytes("archive total", extractionProgress.totalBytes, ARCHIVE_LIMITS.maxTotalUncompressedSize);
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
