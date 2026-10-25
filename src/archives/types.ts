import type { GroupView, VaultStats } from "../vault";
import { ARCHIVE_LIMITS } from "./limits";

export type ArchiveFormat = | "zip" | "zipx" | "7z" | "rar" | "alz" | "xz"
    | "egg" | "dmg" | "deb" | "rpm" | "cab" | "cpio" | "ar" | "tar" | "lzma"
    | "tar-gzip" | "tar-bzip2" | "tar-xz" | "gzip" | "bzip2" | "zstd" | "lzh"
    | "tar-zstd" | "compress" | "tar-compress" | "arj" | "xar" | "chm";

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
    details?: string;
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

export interface SupportedDirectoryFile {
    fileName: string;
    filePath: string;
    category: | "vaults" | "archives" | "ssh" | "crypto";
}

export interface ArchiveVault {
    archives: ArchiveFile[];
    supportedFiles: SupportedDirectoryFile[];
    selectedArchivePath: string;

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

export const DEFAULT_ARCHIVE_SECURITY_LIMITS:
ArchiveSecurityLimits = {
    maxEntries: ARCHIVE_LIMITS.maxEntries,
    maxEntrySize: ARCHIVE_LIMITS.maxEntrySize,
    maxTotalUncompressedSize: ARCHIVE_LIMITS.maxTotalUncompressedSize,
    maxCompressionRatio: ARCHIVE_LIMITS.maxCompressionRatio
};
