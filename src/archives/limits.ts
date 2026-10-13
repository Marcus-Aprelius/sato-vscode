export const ARCHIVE_LIMITS = {
    maxEntries: 10_000,
    maxEntrySize: 1024 * 1024 * 1024,
    maxTotalUncompressedSize: 4 * 1024 * 1024 * 1024,
    maxCompressionRatio: 1000,
    maxPreviewSize: 1024 * 1024,
    maxPreviewArchiveSize: 256 * 1024 * 1024
} as const;

export class ArchiveLimitError extends Error {
    constructor(message: string) {
        super(message);

        this.name = "ArchiveLimitError";
    }
}

export function checkEntrySize(
    entryPath: string,
    uncompressedSize: number,
    maximumSize = ARCHIVE_LIMITS.maxEntrySize
): void {
    if (uncompressedSize > maximumSize) {
        throw new ArchiveLimitError(`Archive entry "${entryPath}" exceeds ` + `the maximum allowed size of ` + `${maximumSize} bytes.`);
    }
}

export function checkTotalSize(
    totalUncompressedSize: number,
    maximumSize = ARCHIVE_LIMITS.maxTotalUncompressedSize
): void {
    if (totalUncompressedSize > maximumSize) {
        throw new ArchiveLimitError(`The total uncompressed archive size ` + `exceeds the maximum allowed size of ` + `${maximumSize} bytes.`);
    }
}

export function checkCompressionRatio(
    entryPath: string,
    compressedSize: number,
    uncompressedSize: number,
    maximumRatio = ARCHIVE_LIMITS.maxCompressionRatio
): void {
    if (compressedSize <= 0 || uncompressedSize <= 0) {
        return;
    }

    const ratio = uncompressedSize / compressedSize;

    if (ratio > maximumRatio) {
        throw new ArchiveLimitError(`Archive entry "${entryPath}" has a ` + `suspicious compression ratio of ` + `${ratio.toFixed(2)}:1.`);
    }
}

export function checkActualBytes(
    entryPath: string,
    actualBytes: number,
    maximumSize: number
): void {
    if (actualBytes > maximumSize) {
        throw new ArchiveLimitError(`Reading "${entryPath}" was stopped because ` + `it exceeded the limit of ` + `${maximumSize} bytes.`);
    }
}
