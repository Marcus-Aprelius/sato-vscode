import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";
import { ARCHIVE_LIMITS, checkActualBytes, checkEntrySize } from "./limits";
import { resolveSafeExtractionPath, validateArchiveEntryPath } from "./security";

import type { ArchivePreviewResult } from "./zipPreview";

const IMAGE_MIME_TYPES = new Map<string, string>([
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".gif", "image/gif"],
    [".webp", "image/webp"],
    [".bmp", "image/bmp"]
]);

export async function previewSevenZipEntry(
    archivePath: string,
    entryPath: string,
    password?: string
): Promise<ArchivePreviewResult> {
    const normalizedEntryPath = normalizeEntryPath(entryPath);
    const pathError = validateArchiveEntryPath(normalizedEntryPath);

    if (pathError) {
        return {
            kind: "error",
            message: `Unsafe archive path "${entryPath}": ${pathError}`
        };
    }

    const extension = fileExtension(normalizedEntryPath);
    const mimeType = IMAGE_MIME_TYPES.get(extension);
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-7z-preview-"));

    try {
        const archiveEntryPath = await resolveArchiveEntryPath(archivePath, normalizedEntryPath, password);
        const args = ["x", archivePath, archiveEntryPath, `-o${temporaryDirectory}`, "-y", "-bd", "-bso1", "-bse1", "-spd"];

        if (password !== undefined) {
            args.push(`-p${password}`);
        }

        const result = await runSevenZip(args);

        if (result.exitCode !== 0) {
            return {
                kind: "error",
                message: normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`)
            };
        }

        const extractedPath = resolveSafeExtractionPath(temporaryDirectory, archiveEntryPath);
        const stat = await fs.promises.lstat(extractedPath);

        if (!stat.isFile() || stat.isSymbolicLink()) {
            return {
                kind: "unsupported",
                message: "Preview is available only for regular files."
            };
        }

        checkEntrySize(normalizedEntryPath, stat.size, ARCHIVE_LIMITS.maxPreviewSize);
        const bytes = await fs.promises.readFile(extractedPath);
        checkActualBytes(normalizedEntryPath, bytes.length, ARCHIVE_LIMITS.maxPreviewSize);

        if (mimeType) {
            return {
                kind: "image",
                mimeType,
                content: bytes.toString("base64")
            };
        }

        if (looksBinary(bytes)) {
            return {
                kind: "unsupported",
                message: "Preview is not available for the files."
            };
        }

        return {
            kind: "text",
            content: new TextDecoder("utf-8", {fatal: false}).decode(bytes)
        };

    } catch (error) {
        return {
            kind: "error",
            message: error instanceof Error ? error.message : String(error)
        };

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function resolveArchiveEntryPath(
    archivePath: string,
    normalizedEntryPath: string,
    password?: string
): Promise<string> {
    const args = ["l", "-slt", "-ba", "-bd", archivePath];

    if (password !== undefined) {
        args.push(`-p${password}`);
    }

    const result = await runSevenZip(args);

    if (result.exitCode !== 0) {
        return normalizedEntryPath;
    }

    const availablePaths = collectArchivePaths(result.stdout);

    if (availablePaths.has(normalizedEntryPath)) {
        return normalizedEntryPath;
    }

    const dotPrefixedPath = `./${normalizedEntryPath}`;

    if (availablePaths.has(dotPrefixedPath)) {
        return dotPrefixedPath;
    }

    return normalizedEntryPath;
}

function collectArchivePaths(
    output: string
): Set<string> {
    const paths = new Set<string>();

    for (const line of output.replace(/\r/g, "").split("\n")) {
        const match = line.match(/^Path = (.+)$/);

        if (match?.[1]) {
            paths.add(match[1].replace(/\\/g, "/").replace(/\/+$/, ""));
        }
    }

    return paths;
}

function normalizeEntryPath(
    entryPath: string
): string {
    return entryPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function fileExtension(
    fileName: string
): string {
    const normalized = fileName.toLowerCase();
    const slash = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
    const dot = normalized.lastIndexOf(".");

    if (dot <= slash) {
        return "";
    }

    return normalized.slice(dot);
}

function looksBinary(
    bytes: Uint8Array
): boolean {
    const sampleLength = Math.min(bytes.length, 8192);

    if (sampleLength === 0) {
        return false;
    }

    let suspicious = 0;

    for (let index = 0; index < sampleLength; index++) {
        const value = bytes[index];

        if (value === 0) {
            return true;
        }

        if (value < 7 || (value > 14 && value < 32)) {
            suspicious++;
        }
    }

    return suspicious / sampleLength > 0.1;
}
