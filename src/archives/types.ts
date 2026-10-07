import type { GroupView, VaultStats } from "../vault";

export type ArchiveFormat = | "zip" | "7z" | "tar" | "tar-gzip" | "tar-bzip2" | "tar-xz" | "gzip" | "bzip2" | "xz";
export type ArchiveEntryType = | "file" | "directory" | "symlink" | "hardlink" | "other";

export interface ArchiveEntry {
    path: string;
    type: ArchiveEntryType;
    compressedSize?: number;
    uncompressedSize: number;
    modifiedAt?: string;
    encrypted: boolean;
    linkTarget?: string;
    compressionMethod?: string;
    compressionRatio?: number;
    crc32?: string;
}
export interface ArchiveInspection {
    fileName: string;
    filePath: string;
    format: ArchiveFormat;
    encrypted: boolean;
    fileSize: number;
    entryCount: number;
    totalUncompressedSize: number;
    entries: ArchiveEntry[];
    warnings: string[];
}

export interface ArchiveFile {
    fileName: string;
    filePath: string;
    inspection: ArchiveInspection;
    tree: GroupView;
    stats: VaultStats;
    selectedEntryId: string;
    password?: string;
}

export interface ArchiveVault {
    archives: ArchiveFile[];
    selectedArchivePath: string;

    /*
     * Compatibility fields for the currently selected archive.
     * They will be removed after the UI migration is complete.
     */
    tree: GroupView;
    stats: VaultStats;
    inspection: ArchiveInspection;
    selectedEntryId: string;
    password?: string;
}

export interface ArchiveSecurityLimits {
    maxEntries: number;
    maxEntrySize: number;
    maxTotalUncompressedSize: number;
    maxCompressionRatio: number;
}

export const DEFAULT_ARCHIVE_SECURITY_LIMITS: ArchiveSecurityLimits = {
    maxEntries: 10000,
    maxEntrySize: 1024 * 1024 * 1024,
    maxTotalUncompressedSize: 4 * 1024 * 1024 * 1024,
    maxCompressionRatio: 1000
};
