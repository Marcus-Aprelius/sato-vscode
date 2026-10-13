import * as fs from "fs";
import * as path from "path";

import { listUneggArchive } from "./uneggCli";
import { DEFAULT_ARCHIVE_SECURITY_LIMITS } from "./types";
import { resolveSplitArchivePrimaryPath } from "./splitArchivePath";

import type { ArchiveEntry, ArchiveFormat, ArchiveInspection, ArchiveSecurityLimits } from "./types";

export async function inspectUneggArchive(
    filePath: string,
    format: ArchiveFormat,
    limits: ArchiveSecurityLimits = DEFAULT_ARCHIVE_SECURITY_LIMITS,
    password?: string
): Promise<ArchiveInspection> {
    const resolution = await resolveSplitArchivePrimaryPath(filePath);
    const primaryPath = resolution.primaryPath;
    const stat = await fs.promises.stat(primaryPath);
    const output = await listUneggArchive(primaryPath, password);
    const entries = parseUneggEntries(output);

    validateLimits(entries, limits);

    return {
        fileName: path.basename(primaryPath),
        filePath: primaryPath,
        format,
        encrypted: entries.some(entry => entry.encrypted),
        fileSize: stat.size,
        entryCount: entries.length,
        totalUncompressedSize: entries.reduce((total, entry) => total + entry.uncompressedSize, 0),
        entries,
        warnings: resolution.split ? [`Multi-volume archive opened through "${path.basename(primaryPath)}".`] : []
    };
}

function parseUneggEntries(
    output: string
): ArchiveEntry[] {
    const entries: ArchiveEntry[] = [];

    for (const rawLine of output.replace(/\r/g, "").split("\n")) {
        const line = rawLine.trim();

        if (!line) {
            continue;
        }

        const match = line.match(/^(\d+)\s+(?:(e)\s+)?(\d{4}-\d{2}-\d{2}T[^\s]+)\s+(.+)$/);

        if (!match) {
            continue;
        }

        const uncompressedSize = Number.parseInt(match[1], 10);
        const encrypted = match[2] === "e";
        const modifiedAt = match[3];
        const entryPath = normalizeEntryPath(match[4]);

        if (!entryPath || !Number.isSafeInteger(uncompressedSize) ||uncompressedSize < 0) {
            continue;
        }

        entries.push({
            path: entryPath,
            type: entryPath.endsWith("/") ? "directory" : "file",
            uncompressedSize,
            modifiedAt,
            encrypted
        });
    }

    return entries;
}

function normalizeEntryPath(
    value: string
): string {
    return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function validateLimits(
    entries: readonly ArchiveEntry[],
    limits: ArchiveSecurityLimits
): void {
    if (entries.length > limits.maxEntries) {
        throw new Error(`Archive contains too many entries: ${entries.length}.`);
    }

    let totalSize = 0;

    for (const entry of entries) {
        if (entry.uncompressedSize > limits.maxEntrySize) {
            throw new Error(`Archive entry is too large: ${entry.path}.`);
        }

        totalSize += entry.uncompressedSize;

        if (totalSize > limits.maxTotalUncompressedSize) {
            throw new Error("Archive total uncompressed size exceeds the configured limit.");
        }
    }
}
