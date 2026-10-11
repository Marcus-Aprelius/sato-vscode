import * as fs from "fs";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";

import type { Entry, FileEntry } from "@zip.js/zip.js";

const MAX_PASSWORD_CHECK_ARCHIVE_SIZE = 256 * 1024 * 1024;

export async function testEncryptedZipPassword(
    archivePath: string,
    password: string
): Promise<boolean> {
    if (!password) {
        return false;
    }

    const stat = await fs.promises.stat(archivePath);

    if (stat.size > MAX_PASSWORD_CHECK_ARCHIVE_SIZE) {
        throw new Error("The encrypted ZIP is too large for password " + "verification with the built-in ZIP engine.");
    }

    const archiveBytes = await fs.promises.readFile(archivePath);
    const zipReader = new ZipReader(new Uint8ArrayReader(archiveBytes));

    try {
        const entries = await zipReader.getEntries();
        const encryptedEntry = entries.find(isEncryptedFileEntry);

        if (!encryptedEntry) {
            return true;
        }

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

function isWrongZipPasswordError(
    error: unknown
): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    return (normalized.includes("password") || normalized.includes("authentication") || normalized.includes("encrypted"));
}

function isEncryptedFileEntry(
    entry: Entry
): entry is FileEntry {
    return (!entry.directory && entry.encrypted === true && "getData" in entry && typeof entry.getData === "function");
}
