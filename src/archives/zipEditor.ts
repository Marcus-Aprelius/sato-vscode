import * as fs from "fs";
import * as path from "path";
import { validateArchiveEntryPath } from "./security";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter} from "@zip.js/zip.js";

export type ZipEditOperation =
    | { type: "addFile"; sourcePath: string; archivePath: string; }
    | { type: "createFolder"; archivePath: string; }
    | { type: "deleteEntry"; archivePath: string; }
    | { type: "deleteFolder"; archivePath: string; };

export interface ZipEditOptions {
    password?: string;
    createBackup?: boolean;
}

export interface ZipEditResult {
    backupPath?: string;
    addedEntries: string[];
    deletedEntries: string[];
}

export async function editZipArchive(
    archiveFilePath: string,
    operation: ZipEditOperation,
    options: ZipEditOptions = {}
): Promise<ZipEditResult> {
    if (options.password) {
        throw new Error("Editing password-protected ZIP archives is not implemented yet.");
    }

    validateEditOperation(operation);

    const archiveBytes = await fs.promises.readFile(archiveFilePath);
    const reader = new ZipReader(new Uint8ArrayReader(archiveBytes));
    const outputWriter = new Uint8ArrayWriter();
    const writer = new ZipWriter(outputWriter);
    const addedEntries: string[] = [];
    const deletedEntries: string[] = [];

    try {
        const entries = await reader.getEntries();

        for (const entry of entries) {
            const entryPath = normalizeArchivePath(entry.filename);

            if (!entryPath) {
                continue;
            }

            if (shouldDeleteEntry(entryPath, operation)) {
                deletedEntries.push(entryPath);
                continue;
            }

            if (entry.directory) {
                await writer.add(ensureDirectoryPath(entryPath), undefined, {directory: true, lastModDate: entry.lastModDate});

                continue;
            }

            const data = await entry.getData(new Uint8ArrayWriter(), { checkCrc32: true, checkAuthenticationCode: true});
            await writer.add(entryPath, new Uint8ArrayReader(data), {lastModDate: entry.lastModDate});
        }

        await applyEditOperation(writer, operation, addedEntries);
        await writer.close();

        const newArchiveBytes = await outputWriter.getData();
        const temporaryPath = createTemporaryArchivePath(archiveFilePath);
        const backupPath = options.createBackup === false ? undefined : `${archiveFilePath}.bak`;

        try {
            await fs.promises.writeFile(temporaryPath, newArchiveBytes, {flag: "wx", mode: 0o600});
            await verifyCreatedZip(temporaryPath);

            if (backupPath) {
                await fs.promises.copyFile(archiveFilePath, backupPath);
            }

            await replaceArchiveFile(temporaryPath, archiveFilePath);

            return {backupPath, addedEntries, deletedEntries};

        } catch (error) {
            await fs.promises.unlink(temporaryPath).catch(() => undefined);

            throw error;
        }
    } finally {
        await reader.close();

        try {
            await writer.close();

        } catch {
            // Writer may already be closed.
        }
    }
}

async function applyEditOperation(
    writer: ZipWriter<Uint8Array>,
    operation: ZipEditOperation,
    addedEntries: string[]
): Promise<void> {
    switch (operation.type) {
        case "addFile": {
            const sourceBytes = await fs.promises.readFile(operation.sourcePath);
            const archivePath = normalizeArchivePath(operation.archivePath);
            await writer.add(archivePath, new Uint8ArrayReader(sourceBytes), {lastModDate: (await fs.promises.stat(operation.sourcePath)).mtime});
            addedEntries.push(archivePath);

            return;
        }

        case "createFolder": {
            const archivePath = ensureDirectoryPath(normalizeArchivePath(operation.archivePath));
            await writer.add(archivePath, undefined, { directory: true, lastModDate: new Date()});
            addedEntries.push(archivePath);

            return;
        }

        case "deleteEntry":
        case "deleteFolder":
            return;
    }
}

function shouldDeleteEntry(
    entryPath: string,
    operation: ZipEditOperation
): boolean {
    if (operation.type === "deleteEntry") {
        return entryPath === normalizeArchivePath(operation.archivePath);
    }

    if (operation.type === "deleteFolder") {
        const folderPath = ensureDirectoryPath(normalizeArchivePath( operation.archivePath));

        return (entryPath === folderPath || entryPath.startsWith(folderPath));
    }

    return false;
}

function validateEditOperation(
    operation: ZipEditOperation
): void {
    const archivePath = normalizeArchivePath(operation.archivePath);
    const pathError = validateArchiveEntryPath(archivePath);

    if (pathError) {
        throw new Error(`Unsafe archive path "${operation.archivePath}": ` + pathError);
    }

    if (operation.type === "addFile" && !operation.sourcePath) {
        throw new Error("Source file path is required.");
    }
}

function normalizeArchivePath(
    value: string
): string {
    return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function ensureDirectoryPath(
    value: string
): string {
    return value.endsWith("/") ? value : `${value}/`;
}

function createTemporaryArchivePath(
    archiveFilePath: string
): string {
    return path.join(path.dirname(archiveFilePath), `.${path.basename(archiveFilePath)}.` + `${process.pid}.${Date.now()}.tmp`);
}

async function verifyCreatedZip(
    archiveFilePath: string
): Promise<void> {
    const bytes = await fs.promises.readFile(archiveFilePath);
    const reader = new ZipReader(new Uint8ArrayReader(bytes));

    try {
        await reader.getEntries();

    } finally {
        await reader.close();
    }
}

async function replaceArchiveFile(
    temporaryPath: string,
    archiveFilePath: string
): Promise<void> {
    const previousPath = `${archiveFilePath}.previous`;

    await fs.promises.rm(previousPath, {force: true});
    await fs.promises.rename(archiveFilePath, previousPath);

    try {
        await fs.promises.rename(temporaryPath, archiveFilePath);
        await fs.promises.rm(previousPath, {force: true});

    } catch (error) {
        await fs.promises.rename(previousPath, archiveFilePath);

        throw error;
    }
}
