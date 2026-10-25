import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";
import { validateArchiveEntryPath } from "./security";

import type { ZipEditOperation, ZipEditOptions, ZipEditResult } from "./zipEditor";

export async function editSevenZipArchive(
    archiveFilePath: string,
    operation: ZipEditOperation,
    options: ZipEditOptions = {}
): Promise<ZipEditResult> {
    validateEditOperation(operation);
    const originalStat = await fs.promises.stat(archiveFilePath);
    const rollbackPath = createRollbackPath(archiveFilePath);

    const backupPath = options.createBackup === false ? undefined : `${archiveFilePath}.bak`;

    await fs.promises.copyFile(archiveFilePath, rollbackPath);

    if (backupPath) {
        await fs.promises.copyFile(archiveFilePath, backupPath);
        await preserveFileMetadata(backupPath, originalStat);
    }

    const addedEntries: string[] = [];
    const deletedEntries: string[] = [];

    try {
        switch (operation.type) {
            case "addFile":
                await addFileToArchive(archiveFilePath, operation.sourcePath, operation.archivePath, options.password);
                addedEntries.push(normalizeArchivePath(operation.archivePath));
                break;

            case "createFolder":
                await addFolderToArchive(archiveFilePath, operation.archivePath, options.password);
                addedEntries.push(ensureDirectoryPath(normalizeArchivePath(operation.archivePath)));
                break;

            case "deleteEntry":
                await deleteArchivePath(archiveFilePath, operation.archivePath, false, options.password);
                deletedEntries.push(normalizeArchivePath(operation.archivePath));
                break;

            case "deleteFolder":
                await deleteArchivePath(archiveFilePath, operation.archivePath, true, options.password);
                deletedEntries.push(ensureDirectoryPath(normalizeArchivePath(operation.archivePath)));
                break;
        }

        await verifyArchive(archiveFilePath, options.password);
        await preserveFileMetadata(archiveFilePath, originalStat);
        await fs.promises.rm(rollbackPath, {force: true});

        return {backupPath, addedEntries, deletedEntries};

    } catch (error) {
        await fs.promises.copyFile(rollbackPath, archiveFilePath);
        await preserveFileMetadata(archiveFilePath, originalStat);
        await fs.promises.rm(rollbackPath, {force: true});

        throw error;
    }

}

async function addFileToArchive(
    archiveFilePath: string,
    sourcePath: string,
    archivePath: string,
    password?: string
): Promise<void> {
    const normalizedArchivePath = normalizeArchivePath(archivePath);
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-7z-edit-"));

    try {
        const stagedPath = path.join(temporaryDirectory, ...normalizedArchivePath.split("/"));
        await fs.promises.mkdir(path.dirname(stagedPath), {recursive: true});
        await fs.promises.copyFile(sourcePath, stagedPath);

        const sourceStat = await fs.promises.stat(sourcePath);
        await fs.promises.utimes(stagedPath, sourceStat.atime, sourceStat.mtime);
        await runUpdateCommand(archiveFilePath, normalizedArchivePath, temporaryDirectory, password);

    } finally {
        await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    }
}

async function addFolderToArchive(
    archiveFilePath: string,
    archivePath: string,
    password?: string
): Promise<void> {
    const normalizedArchivePath = normalizeArchivePath(archivePath);
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-7z-folder-"));

    try {
        const stagedDirectory = path.join(temporaryDirectory, ...normalizedArchivePath.split("/"));
        await fs.promises.mkdir(stagedDirectory, {recursive: true});
        await runUpdateCommand(archiveFilePath, ensureDirectoryPath(normalizedArchivePath), temporaryDirectory, password);

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function runUpdateCommand(
    archiveFilePath: string,
    archivePath: string,
    workingDirectory: string,
    password?: string
): Promise<void> {
    const args = ["u", archiveFilePath, archivePath, "-y", "-bd", "-bso1", "-bse1"];

    if (password) {
        args.push(`-p${password}`);
    }

    const result = await runSevenZip(args, undefined, {cwd: workingDirectory});
    requireSuccessfulResult(result);
}

async function deleteArchivePath(
    archiveFilePath: string,
    archivePath: string,
    recursive: boolean,
    password?: string
): Promise<void> {
    const normalizedArchivePath = normalizeArchivePath(archivePath);
    const target = recursive ? normalizedArchivePath.replace(/\/+$/, "") : normalizedArchivePath;
    const args = ["d", archiveFilePath, target, "-r-", "-spd", "-y", "-bd", "-bso1", "-bse1"];

    if (password) {
        args.push(`-p${password}`);
    }

    const result = await runSevenZip(args);
    requireSuccessfulResult(result);
}

async function verifyArchive(
    archiveFilePath: string,
    password?: string
): Promise<void> {
    const args = ["t", archiveFilePath, "-y", "-bd", "-bso1", "-bse1"];

    if (password) {
        args.push(`-p${password}`);
    }

    const result = await runSevenZip(args);
    requireSuccessfulResult(result);
}

function requireSuccessfulResult(
    result: {exitCode: number; stdout: string; stderr: string;}
): void {
    if (result.exitCode === 0) {
        return;
    }

    throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
}

function validateEditOperation(
    operation: ZipEditOperation
): void {
    const archivePath = normalizeArchivePath(operation.archivePath);
    const pathError = validateArchiveEntryPath(archivePath);

    if (pathError) {
        throw new Error(`Unsafe archive path "${operation.archivePath}": ${pathError}`);
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

function createRollbackPath(
    archiveFilePath: string
): string {
    return path.join(path.dirname(archiveFilePath), `.${path.basename(archiveFilePath)}.` + `${process.pid}.${Date.now()}.rollback`);
}

async function preserveFileMetadata(
    filePath: string,
    originalStat: fs.Stats
): Promise<void> {
    await fs.promises.chmod(filePath, originalStat.mode & 0o7777);

    if (process.platform !== "win32") {
        await fs.promises.chown(filePath, originalStat.uid, originalStat.gid);
    }

    await fs.promises.utimes(filePath, originalStat.atime, originalStat.mtime);
}
