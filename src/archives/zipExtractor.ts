import * as fs from "fs";
import * as path from "path";
import * as yauzl from "yauzl";

import { Transform } from "stream";
import { inspectZipArchive } from "./zipReader";
import { inspectArchiveSecurity, resolveSafeExtractionPath } from "./security";
import { applyExtractionMetadata, readExtractionMetadata } from "./extractionMetadata";
import { ARCHIVE_LIMITS, checkActualBytes, checkCompressionRatio, checkEntrySize } from "./limits";

import type { Readable } from "stream";
import type { ExtractionMetadata } from "./extractionMetadata";
import type { ArchiveEntry, ArchiveSecurityLimits} from "./types";

export interface ZipExtractionResult {
    destinationDirectory: string;
    extractedFiles: string[];
    skippedEntries: string[];
}

export async function extractZipArchive(
    filePath: string,
    destinationDirectory: string,
    selectedPaths?: ReadonlySet<string>,
    limits?: ArchiveSecurityLimits
): Promise<ZipExtractionResult> {
    const inspection = await inspectZipArchive(filePath, limits);
    const selectedEntries = inspection.entries.filter(entry => !selectedPaths || selectedPaths.has(entry.path));
    const security = inspectArchiveSecurity(selectedEntries, limits);

    if (!security.safe) {
        throw new Error(["Archive extraction was blocked.", ...security.warnings].join("\n"));
    }

    if (inspection.encrypted) {
        throw new Error("Password-protected ZIP archives must be " + "extracted with the encrypted ZIP engine.");
    }

    /* Read the owner and permissions from the closest existing parent before creating the destination. */
    const extractionMetadata = await readExtractionMetadata(destinationDirectory);
    await fs.promises.mkdir(destinationDirectory, { recursive: true });
    await applyExtractionMetadata(destinationDirectory, extractionMetadata, true);
    return extractEntries(filePath, destinationDirectory, selectedEntries, extractionMetadata);
}

function extractEntries(
    filePath: string,
    destinationDirectory: string,
    selectedEntries: ArchiveEntry[],
    extractionMetadata: ExtractionMetadata
): Promise<ZipExtractionResult> {
    return new Promise((resolve, reject) => {
        yauzl.open(
            filePath,
            {
                lazyEntries: true,
                autoClose: true,
                decodeStrings: true,
                validateEntrySizes: true,
                strictFileNames: false
            },
            (openError, zipFile) => {
                if (openError) {
                    reject(openError);
                    return;
                }

                if (!zipFile) {
                    reject(new Error("Failed to open the ZIP archive."));
                    return;
                }

                const selectedPaths = new Set(selectedEntries.map(entry => entry.path));
                const extractedFiles: string[] = [];
                const skippedEntries: string[] = [];
                const extractionProgress = {totalBytes: 0};

                let settled = false;

                const finish = (error?: Error): void => {
                    if (settled) {
                        return;
                    }

                    settled = true;

                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve({destinationDirectory: path.resolve(destinationDirectory), extractedFiles, skippedEntries});
                };

                zipFile.on("error", finish);
                zipFile.on("end", () => finish());
                zipFile.on("entry",entry => {void processZipEntry(zipFile, entry, destinationDirectory, selectedPaths, extractedFiles, skippedEntries, extractionMetadata, extractionProgress).catch(finish);});
                zipFile.readEntry();
            }
        );
    });
}

async function processZipEntry(
    zipFile: yauzl.ZipFile,
    entry: yauzl.Entry,
    destinationDirectory: string,
    selectedPaths: ReadonlySet<string>,
    extractedFiles: string[],
    skippedEntries: string[],
    extractionMetadata: ExtractionMetadata,
    extractionProgress: {totalBytes: number;}
): Promise<void> {
    if (!selectedPaths.has(entry.fileName)) {
        skippedEntries.push(entry.fileName);
        zipFile.readEntry();

        return;
    }

    const destinationPath = resolveSafeExtractionPath(destinationDirectory, entry.fileName);

    if (entry.fileName.endsWith("/")) {
        await fs.promises.mkdir(destinationPath, { recursive: true });
        await applyExtractionMetadata(destinationPath, extractionMetadata, true);
        zipFile.readEntry();

        return;
    }

    const parentDirectory = path.dirname(destinationPath);
    await fs.promises.mkdir(parentDirectory, {recursive: true});
    await applyExtractionMetadata(parentDirectory, extractionMetadata, true);

    checkEntrySize(entry.fileName, entry.uncompressedSize);
    checkCompressionRatio(entry.fileName, entry.compressedSize, entry.uncompressedSize);

    const exists = await pathExists(destinationPath);

    if (exists) {
        throw new Error(`Destination file already exists: ${destinationPath}`);
    }

    const input = await openEntryStream(zipFile, entry);

    await writeEntryStream(input, destinationPath, entry.fileName, entry.uncompressedSize, extractionProgress);
    await applyExtractionMetadata(destinationPath, extractionMetadata, false);

    extractedFiles.push(destinationPath);
    zipFile.readEntry();
}

function openEntryStream(
    zipFile: yauzl.ZipFile,
    entry: yauzl.Entry
): Promise<Readable> {
    return new Promise((resolve, reject) => {
        zipFile.openReadStream(entry, (error, stream) => {
            if (error) {
                reject(error);
                return;
            }

            if (!stream) {
                reject(new Error(`Failed to read ZIP entry: ${entry.fileName}`));
                return;
            }

                resolve(stream);
            }
        );
    });
}

function writeEntryStream(
    input: Readable,
    destinationPath: string,
    entryPath: string,
    declaredSize: number,
    extractionProgress: {
        totalBytes: number;
    }
): Promise<void> {
    const actualEntryLimit = Math.min(declaredSize + 64 * 1024, ARCHIVE_LIMITS.maxEntrySize);

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(destinationPath, {flags: "wx", mode: 0o600});
        let actualEntryBytes = 0;
        let settled = false;

        const limiter = new Transform({
            transform(chunk: Buffer, _encoding, callback): void {
                actualEntryBytes += chunk.length;
                extractionProgress.totalBytes += chunk.length;

                try {
                    checkActualBytes(entryPath, actualEntryBytes, actualEntryLimit);
                    checkActualBytes("archive total", extractionProgress.totalBytes, ARCHIVE_LIMITS.maxTotalUncompressedSize);
                    callback(null, chunk);

                } catch (error) {
                    callback(error instanceof Error ? error : new Error(String(error)));
                }
            }
        });

        const finish = (error?: Error): void => {
            if (settled) {
                return;
            }

            settled = true;

            if (error) {
                input.destroy();
                limiter.destroy();
                output.destroy();

                void fs.promises.unlink(destinationPath).catch(() => undefined);

                reject(error);

                return;
            }

            resolve();
        };

        input.once("error", finish);
        limiter.once("error", finish);
        output.once("error", finish);
        output.once("finish", () => finish());

        input.pipe(limiter).pipe(output);
    });
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
