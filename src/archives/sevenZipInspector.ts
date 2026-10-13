import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { compoundTarFileName, isCompoundTarFormat } from "./compoundTar";
import { normalizeSevenZipError, runSevenZip, SevenZipUnavailableError } from "./sevenZipCli";
import { DEFAULT_ARCHIVE_SECURITY_LIMITS } from "./types";

import type { ArchiveEntry, ArchiveEntryType, ArchiveFormat, ArchiveInspection, ArchiveSecurityLimits} from "./types";

export async function inspectSevenZipArchive(
    filePath: string,
    format: ArchiveFormat,
    limits: ArchiveSecurityLimits = DEFAULT_ARCHIVE_SECURITY_LIMITS,
    password?: string
): Promise<ArchiveInspection> {
    const stat = await fs.promises.stat(filePath);

    if (isCompoundTarFormat(format)) {
        return inspectCompoundTarArchive(filePath, format, stat.size, limits, password);
    }

    if (isSingleCompressedFormat(format)) {
        return inspectSingleCompressedArchive(filePath, format, stat.size, limits, password);
    }

    const args = ["l", "-slt", "-ba", "-bd", filePath];

    if (password !== undefined) {
        args.push(`-p${password}`);
    } else if (format !== "rpm" && format !== "cpio") {
        args.push("-p-");
    }

    const result = await runSevenZip(args);

    if (result.exitCode !== 0) {
        const output = `${result.stdout}\n${result.stderr}`.toLowerCase();

        if (isPasswordRequiredOutput(output)) {
            return {
                fileName: path.basename(filePath),
                filePath,
                format,
                encrypted: true,
                fileSize: stat.size,
                entryCount: 0,
                totalUncompressedSize: 0,
                entries: [],
                warnings: ["The archive file list is encrypted. Unlock the archive to view its contents."]
            };
        }

        throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
    }

    const records = parseSevenZipRecords(result.stdout);
    const entries = records.map(record => createArchiveEntry(record)).filter((entry): entry is ArchiveEntry => entry !== undefined);

    validateInspectionLimits(entries, limits);

    return {
        fileName: path.basename(filePath),
        filePath,
        format,
        encrypted: entries.some(entry => entry.encrypted),
        fileSize: stat.size,
        entryCount: entries.length,
        totalUncompressedSize: entries.reduce((total, entry) => total + entry.uncompressedSize, 0),
        entries,
        warnings: []
    };
}

function parseSevenZipRecords(
    output: string
): Array<Map<string, string>> {
    const records: Array<Map<string, string>> = [];
    let current = new Map<string, string>();

    const flush = (): void => {
        if (current.size > 0) {
            records.push(current);
            current = new Map<string, string>();
        }
    };

    for (const rawLine of output.replace(/\r/g, "").split("\n")) {
        const line = rawLine.trimEnd();

        if (!line.trim()) {
            flush();
            continue;
        }

        const separator = line.indexOf(" = ");

        if (separator < 0) {
            continue;
        }

        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 3);

        current.set(key, value);
    }

    flush();

    return records;
}

function createArchiveEntry(
    record: ReadonlyMap<string, string>
): ArchiveEntry | undefined {
    const entryPath = normalizeEntryPath(record.get("Path") || "");

    if (!entryPath) {
        return undefined;
    }

    const attributes = record.get("Attributes") || "";
    const folder = record.get("Folder") === "+";
    const type = archiveEntryType(folder, attributes);
    const uncompressedSize = parseSize(record.get("Size"));
    const compressedSize = parseOptionalSize(record.get("Packed Size"));
    const encrypted = record.get("Encrypted") === "+" || record.get("Encrypted")?.toLowerCase() === "yes";
    const compressionRatio = compressedSize !== undefined && compressedSize > 0 && uncompressedSize > 0 ? uncompressedSize / compressedSize : undefined;

    return {
        path: entryPath,
        type,
        compressedSize,
        uncompressedSize,
        modifiedAt: record.get("Modified"),
        encrypted,
        compressionMethod: record.get("Method"),
        compressionRatio,
        crc32: record.get("CRC")
    };
}

function archiveEntryType(
    folder: boolean,
    attributes: string
): ArchiveEntryType {
    if (folder || attributes.includes("D")) {
        return "directory";
    }

    if (attributes.includes("L")) {
        return "symlink";
    }

    return "file";
}

function normalizeEntryPath(
    value: string
): string {
    return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function parseSize(
    value: string | undefined
): number {
    const parsed = Number.parseInt(value || "0", 10);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parseOptionalSize(
    value: string | undefined
): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function validateInspectionLimits(
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

        if (entry.compressionRatio !== undefined && entry.compressionRatio > limits.maxCompressionRatio) {
            throw new Error(`Suspicious compression ratio for archive entry: ${entry.path}.`);
        }
    }
}

function isPasswordRequiredOutput(
    output: string
): boolean {
    return (
        output.includes("enter password") || output.includes("wrong password") ||
        output.includes("can not open encrypted archive") || output.includes("headers error")
    );
}

export function isSevenZipUnavailableError(
    error: unknown
): error is SevenZipUnavailableError {
    return error instanceof SevenZipUnavailableError;
}

async function inspectCompoundTarArchive(
    filePath: string,
    format: ArchiveFormat,
    fileSize: number,
    limits: ArchiveSecurityLimits,
    password?: string
): Promise<ArchiveInspection> {
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-tar-"));

    try {
        const args = ["x", filePath, `-o${temporaryDirectory}`, "-y", "-bd", "-bso1", "-bse1"];
        args.push(password !== undefined ? `-p${password}` : "-p-");
        const result = await runSevenZip(args);

        if (result.exitCode !== 0) {
            throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
        }

        const expectedPath = path.join(temporaryDirectory, compoundTarFileName(filePath));
        const innerTarPath = await findExtractedTar(temporaryDirectory, expectedPath);
        const inspection = await inspectSevenZipArchive(innerTarPath, "tar", limits);

        return {...inspection, fileName: path.basename(filePath), filePath, format, fileSize};

    } finally {
        await fs.promises.rm(temporaryDirectory, { recursive: true, force: true});
    }
}

async function findExtractedTar(
    directory: string,
    expectedPath: string
): Promise<string> {
    try {
        const stat = await fs.promises.stat(expectedPath);

        if (stat.isFile()) {
            return expectedPath;
        }

    } catch {
        // Search for the extracted TAR below.
    }

    const entries = await fs.promises.readdir(directory, {withFileTypes: true});
    const tarEntry = entries.find(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".tar"));

    if (!tarEntry) {
        throw new Error("The compressed TAR archive did not contain an inner TAR file.");
    }

    return path.join(directory, tarEntry.name);
}

function isSingleCompressedFormat(
    format: ArchiveFormat
): boolean {
    return (
        format === "gzip" || format === "bzip2" || format === "xz" ||
        format === "zstd" || format === "lzma" || format === "compress"
    );
}

async function inspectSingleCompressedArchive(
    filePath: string,
    format: ArchiveFormat,
    fileSize: number,
    limits: ArchiveSecurityLimits,
    password?: string
): Promise<ArchiveInspection> {
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-compressed-"));

    try {
        const args = ["x", filePath, `-o${temporaryDirectory}`, "-y", "-bd", "-bso1", "-bse1", password !== undefined ? `-p${password}` : "-p-"];
        const result = await runSevenZip(args);

        if (result.exitCode !== 0) {
            throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
        }

        const extracted = await findSingleExtractedFile(temporaryDirectory);
        const stat = await fs.promises.stat(extracted);
        const entryName = path.basename(extracted);

        const entry: ArchiveEntry = {
            path: entryName,
            type: "file",
            compressedSize: fileSize,
            uncompressedSize: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            encrypted: false,
            compressionMethod: archiveFormatMethod(format),
            compressionRatio: fileSize > 0 ? stat.size / fileSize : undefined
        };

        validateInspectionLimits([entry], limits);

        return {
            fileName: path.basename(filePath),
            filePath,
            format,
            encrypted: false,
            fileSize,
            entryCount: 1,
            totalUncompressedSize: stat.size,
            entries: [entry],
            warnings: []
        };

    } finally {
        await fs.promises.rm(temporaryDirectory, { recursive: true, force: true});
    }
}

async function findSingleExtractedFile(
    directory: string
): Promise<string> {
    const entries = await fs.promises.readdir(directory, {withFileTypes: true});
    const file = entries.find(entry => entry.isFile());

    if (!file) {
        throw new Error("The compressed archive did not contain a file.");
    }

    return path.join(directory, file.name);
}

function archiveFormatMethod(
    format: ArchiveFormat
): string {
    switch (format) {
        case "gzip":
            return "GZip";

        case "bzip2":
            return "BZip2";

        case "xz":
            return "XZ";

        case "zstd":
            return "Zstandard";

        case "lzma":
            return "LZMA";

        case "compress":
            return "Unix Compress";

        default:
            return "";
    }
}
