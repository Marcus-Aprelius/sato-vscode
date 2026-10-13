import { openAsBlob } from "fs";
import {checkCompressionRatio, checkEntrySize} from "./limits";
import { BlobReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";

import type {Entry, FileEntry} from "@zip.js/zip.js";

export async function testEncryptedZipPassword(
    archivePath: string,
    password: string
): Promise<boolean> {
    if (!password) {
        return false;
    }

    /*
     * openAsBlob provides lazy random-access reading.
     * The complete ZIP archive is not copied into memory.
     */
    const archiveBlob = await openAsBlob(archivePath);
    const zipReader = new ZipReader(new BlobReader(archiveBlob));

    try {
        const entries = await zipReader.getEntries();
        const encryptedEntry = entries.find(isEncryptedFileEntry);

        if (!encryptedEntry) {
            return true;
        }

        checkEntrySize(encryptedEntry.filename, encryptedEntry.uncompressedSize);
        checkCompressionRatio(encryptedEntry.filename, encryptedEntry.compressedSize, encryptedEntry.uncompressedSize);

        try {
            await encryptedEntry.getData(new Uint8ArrayWriter(), {password, checkPasswordOnly: true, checkAuthenticationCode: true});

            return true;

        } catch (error) {
            if (isWrongZipPasswordError(error)) {
                return false;
            }

            throw error;
        }

    } finally {
        await zipReader.close();
    }
}

function isEncryptedFileEntry(
    entry: Entry
): entry is FileEntry {
    return (!entry.directory && entry.encrypted === true && "getData" in entry && typeof entry.getData === "function");
}

function isWrongZipPasswordError(
    error: unknown
): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    return (normalized.includes("password") || normalized.includes("authentication") || normalized.includes("encrypted"));
}
