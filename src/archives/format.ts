import * as path from "path";

import type { ArchiveFormat } from "./types";

const ARCHIVE_SUFFIXES: ReadonlyArray<{
    suffix: string;
    format: ArchiveFormat;
}> = [
    {suffix: ".tar.gz", format: "tar-gzip"},
    {suffix: ".tar.bz2", format: "tar-bzip2"},
    {suffix: ".tar.xz", format: "tar-xz"},
    {suffix: ".tgz", format: "tar-gzip"},
    {suffix: ".tbz2", format: "tar-bzip2"},
    {suffix: ".txz", format: "tar-xz"},
    {suffix: ".zip.bak", format: "zip"},
    {suffix: ".zip", format: "zip"},
    {suffix: ".7z", format: "7z"},
    {suffix: ".tar", format: "tar"},
    {suffix: ".gz", format: "gzip"},
    {suffix: ".bz2", format: "bzip2"},
    {suffix: ".xz", format: "xz"}
];

export function detectArchiveFormat(
    filePath: string
): ArchiveFormat | undefined {
    const normalized = filePath.toLowerCase();

    for (const candidate of ARCHIVE_SUFFIXES) {
        if (normalized.endsWith(candidate.suffix)) {
            return candidate.format;
        }
    }

    return undefined;
}

export function archiveFileName(
    filePath: string
): string {
    return path.basename(filePath);
}

export function archiveBaseName(
    filePath: string
): string {
    const fileName = archiveFileName(filePath);
    const normalized = fileName.toLowerCase();

    for (const candidate of ARCHIVE_SUFFIXES) {
        if (normalized.endsWith(candidate.suffix)) {
            return fileName.slice(0, fileName.length - candidate.suffix.length);
        }
    }

    return path.parse(fileName).name;
}

export function archiveFormatLabel(
    format: ArchiveFormat
): string {
    switch (format) {
        case "zip":
            return "ZIP";

        case "7z":
            return "7-Zip";

        case "tar":
            return "TAR";

        case "tar-gzip":
            return "TAR.GZ";

        case "tar-bzip2":
            return "TAR.BZ2";

        case "tar-xz":
            return "TAR.XZ";

        case "gzip":
            return "GZip";

        case "bzip2":
            return "BZip2";

        case "xz":
            return "XZ";
    }
}
