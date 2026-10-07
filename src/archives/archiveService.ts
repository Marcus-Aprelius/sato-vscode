import { detectArchiveFormat } from "./format";
import { inspectZipArchive } from "./zipReader";

import type {ArchiveInspection, ArchiveSecurityLimits } from "./types";

export async function inspectArchive(
    filePath: string,
    limits?: ArchiveSecurityLimits
): Promise<ArchiveInspection> {
    const format = detectArchiveFormat(filePath);

    if (!format) {
        throw new Error(`Unsupported archive format: ${filePath}`);
    }

    switch (format) {
        case "zip": return inspectZipArchive(filePath, limits);
        case "7z":
        case "tar":
        case "tar-gzip":
        case "tar-bzip2":
        case "tar-xz":
        case "gzip":
        case "bzip2":
        case "xz": throw new Error(`Archive format ${format} is recognized but not implemented yet.`);
    }
}
