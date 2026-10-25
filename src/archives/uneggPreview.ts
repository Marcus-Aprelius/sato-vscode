import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { extractUneggArchive } from "./uneggCli";
import { ARCHIVE_LIMITS, checkActualBytes, checkEntrySize} from "./limits";
import { resolveSafeExtractionPath, validateArchiveEntryPath } from "./security";

import type { ArchivePreviewResult} from "./zipPreview";

const TEXT_EXTENSIONS = new Set([
    ".txt", ".md", ".log", ".json", ".jsonc",
    ".xml", ".yaml", ".yml", ".csv", ".tsv",
    ".ini", ".conf", ".config", ".env",
    ".properties", ".html", ".htm", ".css",
    ".scss", ".less", ".js", ".mjs", ".cjs",
    ".ts", ".tsx", ".jsx", ".py", ".sh",
    ".bash", ".zsh", ".ps1", ".bat", ".cmd",
    ".sql", ".c", ".h", ".cpp", ".hpp", ".cs",
    ".java", ".go", ".rs", ".rb", ".php",
    ".swift", ".kt", ".kts", ".toml"
]);

const IMAGE_MIME_TYPES = new Map<string, string>([
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".gif", "image/gif"],
    [".webp", "image/webp"],
    [".bmp", "image/bmp"]
]);

export async function previewUneggEntry(
    archivePath: string,
    entryPath: string,
    password?: string
): Promise<ArchivePreviewResult> {
    const normalizedEntryPath = entryPath.replace(/\\/g, "/").replace(/^\/+/, "");
    const pathError = validateArchiveEntryPath(normalizedEntryPath);

    if (pathError) {
        return {
            kind: "error",
            message: `Unsafe archive path "${entryPath}": ${pathError}`
        };
    }

    const extension = fileExtension(normalizedEntryPath);
    const mimeType = IMAGE_MIME_TYPES.get(extension);

    if (!TEXT_EXTENSIONS.has(extension) && !mimeType) {
        return {
            kind: "unsupported",
            message: "Preview is not available for this file type."
        };
    }

    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-unegg-preview-"));

    try {
        await extractUneggArchive(archivePath, temporaryDirectory, password);
        const extractedPath = resolveSafeExtractionPath(temporaryDirectory, normalizedEntryPath);
        const stat = await fs.promises.lstat(extractedPath);

        if (!stat.isFile() || stat.isSymbolicLink()) {
            return {
                kind: "unsupported",
                message:"Preview is available only for regular files."
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

function fileExtension(
    fileName: string
): string {
    const normalized = fileName.toLowerCase();
    const slash = normalized.lastIndexOf("/");
    const dot = normalized.lastIndexOf(".");

    return dot > slash ? normalized.slice(dot) : "";
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
