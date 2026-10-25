import * as fs from "fs";
import * as path from "path";

import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import { preserveFileMetadata } from "./archiveFileMetadata";

export interface ZipPasswordChangeOptions {
    currentPassword: string;
    newPassword?: string;
    createBackup?: boolean;
}

export interface ZipPasswordChangeResult {
    encrypted: boolean;
    backupPath?: string;
}

export async function changeZipPassword(
    archivePath: string,
    options: ZipPasswordChangeOptions
): Promise<ZipPasswordChangeResult> {
    const originalStat = await fs.promises.stat(archivePath);
    const inputBytes = await fs.promises.readFile(archivePath);
    const reader = new ZipReader(new Uint8ArrayReader(inputBytes));
    const output = new Uint8ArrayWriter();
    const writer = new ZipWriter(output);

    let writerClosed = false;

    try {
        const entries = await reader.getEntries();

        for (const entry of entries) {
            const entryName = normalizeEntryName(entry.filename, entry.directory);

            if (!entryName) {
                continue;
            }

            if (entry.directory) {
                await writer.add(entryName, undefined, createWriteOptions(options.newPassword, true, entry.lastModDate));

                continue;
            }

            const data = await entry.getData(new Uint8ArrayWriter(), options.currentPassword
                ? {password: options.currentPassword, checkAuthenticationCode: true, checkCrc32: true}
                : {checkAuthenticationCode: true, checkCrc32: true}
            );

            await writer.add(entryName, new Uint8ArrayReader(data), createWriteOptions(options.newPassword, false, entry.lastModDate));
        }

        await writer.close();
        writerClosed = true;

        const outputBytes = await output.getData();
        const temporaryPath = createTemporaryPath(archivePath);
        const backupPath = options.createBackup === true ? `${archivePath}.bak` : undefined;

        try {
            await fs.promises.writeFile(temporaryPath, outputBytes, {flag: "wx", mode: originalStat.mode & 0o7777});
            await preserveFileMetadata(temporaryPath, originalStat);
            await verifyGeneratedArchive(temporaryPath, options.newPassword);

            if (backupPath) {
                await fs.promises.copyFile(archivePath, backupPath);
                await preserveFileMetadata(backupPath, originalStat);
            }

            await replaceArchiveFile(temporaryPath, archivePath);

            return {encrypted: Boolean(options.newPassword), backupPath};

        } catch (error) {
            await fs.promises.unlink(temporaryPath).catch(() => undefined);

            throw error;
        }
    } finally {
        await reader.close();

        if (!writerClosed) {
            try {
                await writer.close();
            } catch {
                // Ignore cleanup errors.
            }
        }
    }
}

function createWriteOptions(
    password: string | undefined,
    directory: boolean,
    lastModDate: Date
) {
    if (!password) {
        return {directory, lastModDate};
    }

    return {directory, lastModDate, password, encrypted: true, encryptionStrength: 3 as const};
}

async function verifyGeneratedArchive(
    archivePath: string,
    password?: string
): Promise<void> {
    const bytes = await fs.promises.readFile(archivePath);
    const reader = new ZipReader(new Uint8ArrayReader(bytes));

    try {
        const entries = await reader.getEntries();
        const firstFile = entries.find( entry => !entry.directory);

        if (!firstFile) {
            return;
        }

        await firstFile.getData(new Uint8ArrayWriter(), {password, checkPasswordOnly: Boolean(password), checkAuthenticationCode: true, checkCrc32: true});

    } finally {
        await reader.close();
    }
}

function normalizeEntryName(
    value: string,
    directory: boolean
): string {
    const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");

    if (!normalized) {
        return "";
    }

    if (directory && !normalized.endsWith("/")) {
        return `${normalized}/`;
    }

    return normalized;
}

function createTemporaryPath(
    archivePath: string
): string {
    return path.join(path.dirname(archivePath), `.${path.basename(archivePath)}.` + `${process.pid}.${Date.now()}.password.tmp`);
}

async function replaceArchiveFile(
    temporaryPath: string,
    archivePath: string
): Promise<void> {
    const previousPath = `${archivePath}.previous`;
    await fs.promises.rm(previousPath, {force: true});
    await fs.promises.rename(archivePath, previousPath);

    try {
        await fs.promises.rename(temporaryPath, archivePath);
        await fs.promises.rm(previousPath, {force: true});

    } catch (error) {
        await fs.promises.rename(previousPath, archivePath);

        throw error;
    }
}
