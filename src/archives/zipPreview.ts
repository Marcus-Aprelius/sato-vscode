import * as yauzl from "yauzl";
import { openAsBlob } from "fs";
import { BlobReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";

import type { Entry, FileEntry } from "@zip.js/zip.js";

import { ARCHIVE_LIMITS, checkActualBytes, checkCompressionRatio, checkEntrySize } from "./limits";

export interface ArchivePreviewResult {
    kind: | "text" | "image" | "unsupported" | "error";
    content?: string;
    mimeType?: string;
    message?: string;
}

const TEXT_EXTENSIONS =
    new Set([
        ".txt",
        ".md",
        ".log",
        ".json",
        ".jsonc",
        ".xml",
        ".yaml",
        ".yml",
        ".csv",
        ".tsv",
        ".ini",
        ".conf",
        ".config",
        ".env",
        ".properties",
        ".html",
        ".htm",
        ".css",
        ".scss",
        ".less",
        ".js",
        ".mjs",
        ".cjs",
        ".ts",
        ".tsx",
        ".jsx",
        ".py",
        ".sh",
        ".bash",
        ".zsh",
        ".ps1",
        ".bat",
        ".cmd",
        ".sql",
        ".c",
        ".h",
        ".cpp",
        ".hpp",
        ".cs",
        ".java",
        ".go",
        ".rs",
        ".rb",
        ".php",
        ".swift",
        ".kt",
        ".kts",
        ".toml"
    ]);

const IMAGE_MIME_TYPES = new Map<string, string>([
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".gif", "image/gif"],
    [".webp", "image/webp"],
    [".bmp", "image/bmp"]
]);

export async function previewZipEntry(
    archivePath: string,
    entryPath: string,
    password?: string
): Promise<ArchivePreviewResult> {
    const extension = fileExtension(entryPath);
    const mimeType = IMAGE_MIME_TYPES.get(extension);
    const supported = TEXT_EXTENSIONS.has(extension) || Boolean(mimeType);

    if (!supported) {
        return {
            kind: "unsupported",
            message: "Preview is not available for " + "this file type."
        };
    }

    try {
        const bytes = password ? await readEncryptedZipEntry(archivePath, entryPath, password) : await readPlainZipEntry(archivePath, entryPath);

        if (bytes.length > ARCHIVE_LIMITS.maxPreviewSize) {
            return {
                kind: "unsupported",
                message: "Preview is limited to files " + "smaller than 1 MB."
            };
        }

        if (mimeType) {
            return {
                kind: "image",
                mimeType,
                content: Buffer.from(bytes).toString("base64")
            };
        }

        if (looksBinary(bytes)) {
            return {
                kind: "unsupported",
                message: "Preview is not available for " + "binary files."
            };
        }

        return {
            kind: "text",
            content: new TextDecoder("utf-8", { fatal: false }).decode(bytes)
        };

    } catch (error) {
        return {
            kind: "error",
            message: error instanceof Error ? error.message : String(error)
        };
    }
}

function readPlainZipEntry(
    archivePath: string,
    entryPath: string
): Promise<Uint8Array> {
    return new Promise(
        (resolve, reject) => {
            yauzl.open(
                archivePath,
                {lazyEntries: true, autoClose: true, decodeStrings: true, validateEntrySizes: true},
                (openError, zipFile) => {
                    if (openError) {
                        reject(openError);
                        return;
                    }

                    if (!zipFile) {
                        reject(new Error("Failed to open the ZIP archive."));

                        return;
                    }

                    let found = false;

                    zipFile.on(
                        "entry",
                        entry => {
                            if (entry.fileName !== entryPath) {
                                zipFile.readEntry();
                                return;
                            }

                            found = true;

                            try {
                                checkEntrySize(entry.fileName, entry.uncompressedSize, ARCHIVE_LIMITS.maxPreviewSize);
                                checkCompressionRatio(entry.fileName, entry.compressedSize, entry.uncompressedSize);

                            } catch (error) {
                                zipFile.close();
                                reject(error);

                                return;
                            }

                            zipFile.openReadStream(entry,
                                (streamError, stream) => {
                                    if (streamError || !stream) {
                                        reject(streamError || new Error("Failed to read the ZIP entry."));

                                        return;
                                    }

                                    const chunks: Buffer[] = [];
                                    let size = 0;

                                    stream.on("data", chunk => {
                                        const buffer = Buffer.from(chunk);
                                        size += buffer.length;

                                        try {
                                            checkActualBytes(entry.fileName,size, ARCHIVE_LIMITS.maxPreviewSize);

                                        } catch (error) {
                                            stream.destroy(error instanceof Error ? error : new Error(String(error)));

                                            return;
                                        }

                                        chunks.push(buffer);
                                    });

                                    stream.once("error",reject);
                                    stream.once("end", () => {resolve(Buffer.concat(chunks));});}
                            );
                        }
                    );

                    zipFile.once("end", () => {
                        if (!found) {
                            reject(new Error("Archive entry was not found."));
                        }
                    });

                    zipFile.once("error", reject);
                    zipFile.readEntry();
                }
            );
        }
    );
}

async function readEncryptedZipEntry(
    archivePath: string,
    entryPath: string,
    password: string
): Promise<Uint8Array> {

    const archiveBlob = await openAsBlob(archivePath);
    const reader = new ZipReader(new BlobReader(archiveBlob));

    try {
        const entries = await reader.getEntries();
        const entry = entries.filter(isFileEntry).find(candidate => candidate.filename === entryPath);

        if (!entry) {
            throw new Error("Archive entry was not found.");
        }

        checkEntrySize(entry.filename, entry.uncompressedSize, ARCHIVE_LIMITS.maxPreviewSize);
        checkCompressionRatio(entry.filename, entry.compressedSize, entry.uncompressedSize);

        const data = await entry.getData(new Uint8ArrayWriter(), { password, checkAuthenticationCode: true, checkCrc32: true });
        checkActualBytes(entry.filename, data.length, ARCHIVE_LIMITS.maxPreviewSize);

        return data;

    } finally {
        await reader.close();
    }
}

function isFileEntry(
    entry: Entry
): entry is FileEntry {
    return (!entry.directory && "getData" in entry && typeof entry.getData === "function");
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

    return (suspicious / sampleLength > 0.1);
}
