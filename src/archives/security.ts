import * as path from "path";
import { DEFAULT_ARCHIVE_SECURITY_LIMITS } from "./types";

import type { ArchiveEntry, ArchiveSecurityLimits } from "./types";

export interface ArchiveSecurityCheck {
    safe: boolean;
    warnings: string[];
}

export function inspectArchiveSecurity(
    entries: ArchiveEntry[],
    limits: ArchiveSecurityLimits = DEFAULT_ARCHIVE_SECURITY_LIMITS
): ArchiveSecurityCheck {
    const warnings: string[] = [];

    if (entries.length > limits.maxEntries) {
        warnings.push(`Archive contains ${entries.length} entries; ` + `the configured limit is ${limits.maxEntries}.`);
    }

    let totalUncompressedSize = 0;

    for (const entry of entries) {
        const pathError = validateArchiveEntryPath(entry.path);

        if (pathError) {
            warnings.push(`${entry.path}: ${pathError}`);
        }

        if (entry.type === "symlink" || entry.type === "hardlink") {
            warnings.push(`${entry.path}: archive links are not allowed.`);
        }

        if (entry.uncompressedSize > limits.maxEntrySize) {
            warnings.push(`${entry.path}: uncompressed size exceeds ` + `${limits.maxEntrySize} bytes.`);
        }

        totalUncompressedSize += entry.uncompressedSize;

        if (entry.compressedSize !== undefined && entry.compressedSize > 0) {
            const compressionRatio = entry.uncompressedSize / entry.compressedSize;

            if (compressionRatio > limits.maxCompressionRatio) {
                warnings.push(`${entry.path}: compression ratio ` + `${compressionRatio.toFixed(2)} exceeds ` + `${limits.maxCompressionRatio}.`);
            }
        }
    }

    if (totalUncompressedSize > limits.maxTotalUncompressedSize) {
        warnings.push(`Total uncompressed size exceeds ` + `${limits.maxTotalUncompressedSize} bytes.`);
    }

    return {
        safe: warnings.length === 0,
        warnings
    };
}

export function validateArchiveEntryPath(
    entryPath: string
): string | undefined {
    if (!entryPath.trim()) {
        return "entry path is empty.";
    }

    if (entryPath.includes("\0")) {
        return "entry path contains a null byte.";
    }

    const normalized = entryPath.replace(/\\/g, "/");

    if (normalized.startsWith("/") || normalized.startsWith("//")) {
        return "absolute paths are not allowed.";
    }

    if (/^[A-Za-z]:\//.test(normalized)) {
        return "Windows drive paths are not allowed.";
    }

    const segments = normalized.split("/");

    if (segments.includes("..")) {
        return "parent directory traversal is not allowed.";
    }

    return undefined;
}

export function resolveSafeExtractionPath(
    destinationDirectory: string,
    entryPath: string
): string {
    const pathError = validateArchiveEntryPath(entryPath);

    if (pathError) {
        throw new Error(`Unsafe archive path "${entryPath}": ${pathError}`);
    }

    const destinationRoot = path.resolve(destinationDirectory);
    const resolvedPath = path.resolve(destinationRoot, entryPath);
    const relativePath = path.relative(destinationRoot, resolvedPath);

    if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
        throw new Error(`Archive entry escapes the destination directory: ` + entryPath);
    }

    return resolvedPath;
}
