import * as fs from "fs";
import * as path from "path";
import * as yauzl from "yauzl";

import { inspectArchiveSecurity } from "./security";

import type {
    ArchiveEntry,
    ArchiveEntryType,
    ArchiveInspection,
    ArchiveSecurityLimits
} from "./types";

export async function inspectZipArchive(
    filePath: string,
    limits?: ArchiveSecurityLimits
): Promise<ArchiveInspection> {
    const zipFile = await openZipFile(filePath);
    const entries: ArchiveEntry[] = [];

    try {
        await readZipEntries(zipFile, entries);
    } finally {
        zipFile.close();
    }

    const security = inspectArchiveSecurity(entries, limits);
    const stat = await fs.promises.stat(filePath);

    return {
        fileName: path.basename(filePath),
        filePath,
        format: "zip",
        encrypted: entries.some(entry => entry.encrypted),
        fileSize: stat.size,
        entryCount: entries.length,
        totalUncompressedSize: entries.reduce((total, entry) => total + entry.uncompressedSize, 0),
        entries,
        warnings: security.warnings
    };
}

function openZipFile(
    filePath: string
): Promise<yauzl.ZipFile> {
    return new Promise((resolve, reject) => {
        yauzl.open(
            filePath,
            {
                lazyEntries: true,
                autoClose: false,
                decodeStrings: true,
                validateEntrySizes: true,
                strictFileNames: false
            },
            (error, zipFile) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (!zipFile) {
                    reject(new Error("Failed to open the ZIP archive."));
                    return;
                }

                resolve(zipFile);
            }
        );
    });
}

function readZipEntries(
    zipFile: yauzl.ZipFile,
    entries: ArchiveEntry[]
): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false;

        const cleanup = (): void => {
            zipFile.removeListener("entry", onEntry);
            zipFile.removeListener("end", onEnd);
            zipFile.removeListener("error", onError);
        };

        const finish = (error?: Error): void => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();

            if (error) {
                reject(error);
                return;
            }

            resolve();
        };

        const onEntry = (entry: yauzl.Entry): void => {
            entries.push(mapZipEntry(entry));
            zipFile.readEntry();
        };

        const onEnd = (): void => {
            finish();
        };

        const onError = (error: Error): void => {
            finish(error);
        };

        zipFile.on("entry", onEntry);
        zipFile.once("end", onEnd);
        zipFile.once("error", onError);
        zipFile.readEntry();
    });
}

function mapZipEntry(
    entry: yauzl.Entry
): ArchiveEntry {
    const compressionRatio = entry.compressedSize > 0 ? entry.uncompressedSize / entry.compressedSize : undefined;

    return {
        path: entry.fileName,
        type: zipEntryType(entry),
        compressedSize: entry.compressedSize,
        uncompressedSize: entry.uncompressedSize,
        modifiedAt: entry.getLastModDate().toISOString(),
        encrypted: (entry.generalPurposeBitFlag & 0x1) !== 0,
        compressionMethod: zipCompressionMethodLabel(entry.compressionMethod),
        compressionRatio,
        crc32: entry.crc32.toString(16).toUpperCase().padStart(8, "0")
    };
}

function zipCompressionMethodLabel(
    method: number
): string {
    switch (method) {
        case 0:
            return "Stored";

        case 8:
            return "Deflate";

        case 9:
            return "Deflate64";

        case 12:
            return "BZip2";

        case 14:
            return "LZMA";

        case 93:
            return "Zstandard";

        case 95:
            return "XZ";

        case 98:
            return "PPMd";

        default:
            return `Method ${method}`;
    }
}

function zipEntryType(
    entry: yauzl.Entry
): ArchiveEntryType {
    if (entry.fileName.endsWith("/")) {
        return "directory";
    }

    const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff;
    const fileType = unixMode & 0xf000;

    if (fileType === 0xa000) {
        return "symlink";
    }

    return "file";
}
