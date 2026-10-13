import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { compoundTarFileName } from "./compoundTar";
import { editSevenZipArchive } from "./sevenZipEditor";
import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";

import type { ArchiveFormat } from "./types";
import type { ZipEditOperation, ZipEditOptions, ZipEditResult } from "./zipEditor";

export async function editCompoundTarArchive(
    archiveFilePath: string,
    format: ArchiveFormat,
    operation: ZipEditOperation,
    options: ZipEditOptions = {}
): Promise<ZipEditResult> {
    const originalStat = await fs.promises.stat(archiveFilePath);
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-compound-tar-"));
    const rollbackPath = createRollbackPath(archiveFilePath);
    const outputPath = createOutputPath(archiveFilePath);
    const backupPath = options.createBackup === false ? undefined : `${archiveFilePath}.bak`;

    await fs.promises.copyFile(archiveFilePath, rollbackPath);

    try {
        await extractInnerTar(archiveFilePath, temporaryDirectory);
        const innerTarPath = await findInnerTar(temporaryDirectory, compoundTarFileName(archiveFilePath));
        const result = await editSevenZipArchive(innerTarPath, operation, {password: undefined, createBackup: false});
        await compressInnerTar(innerTarPath, outputPath, format);

        if (backupPath) {
            await fs.promises.copyFile(archiveFilePath, backupPath);
            await preserveFileMetadata(backupPath, originalStat);
        }

        await replaceArchiveFile(outputPath, archiveFilePath);
        await preserveFileMetadata(archiveFilePath, originalStat);
        await fs.promises.rm(rollbackPath, {force: true});

        return {backupPath, addedEntries: result.addedEntries, deletedEntries: result.deletedEntries};

    } catch (error) {
        await fs.promises.rm(outputPath, {force: true});
        await fs.promises.copyFile(rollbackPath, archiveFilePath);
        await preserveFileMetadata(archiveFilePath, originalStat);
        await fs.promises.rm(rollbackPath, {force: true});
        throw error;

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function extractInnerTar(
    archiveFilePath: string,
    destinationDirectory: string
): Promise<void> {
    const result = await runSevenZip(["x", archiveFilePath, `-o${destinationDirectory}`, "-y", "-bd", "-bso1", "-bse1", "-p-"]);
    requireSuccessfulResult(result);
}

async function compressInnerTar(
    innerTarPath: string,
    outputPath: string,
    format: ArchiveFormat
): Promise<void> {
    const result = await runSevenZip(
        ["a", compressionTypeArgument(format), outputPath, path.basename(innerTarPath), "-y", "-bd", "-bso1", "-bse1"],
        undefined, { cwd: path.dirname(innerTarPath) }
    );

    requireSuccessfulResult(result);
}

function compressionTypeArgument(
    format: ArchiveFormat
): string {
    switch (format) {
        case "tar-gzip":
            return "-tgzip";

        case "tar-bzip2":
            return "-tbzip2";

        case "tar-xz":
            return "-txz";

        default:
            throw new Error(`Unsupported compound TAR format: ${format}`);
    }
}

async function findInnerTar(
    directory: string,
    expectedName: string
): Promise<string> {
    const expectedPath = path.join(directory, expectedName);

    try {
        const stat = await fs.promises.stat(expectedPath);

        if (stat.isFile()) {
            return expectedPath;
        }

    } catch {
        // Search below.
    }

    const entries = await fs.promises.readdir(directory, {withFileTypes: true});
    const entry = entries.find(candidate => candidate.isFile() && candidate.name.toLowerCase().endsWith(".tar"));

    if (!entry) {
        throw new Error("The compressed archive does not contain an inner TAR file.");
    }

    return path.join(directory, entry.name);
}

function requireSuccessfulResult(
    result: {
        exitCode: number;
        stdout: string;
        stderr: string;
    }
): void {
    if (result.exitCode === 0) {
        return;
    }

    throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
}

function createRollbackPath(
    archiveFilePath: string
): string {
    return path.join(path.dirname(archiveFilePath), `.${path.basename(archiveFilePath)}.` + `${process.pid}.${Date.now()}.rollback`);
}

function createOutputPath(
    archiveFilePath: string
): string {
    return path.join(path.dirname(archiveFilePath), `.${path.basename(archiveFilePath)}.` + `${process.pid}.${Date.now()}.tmp`);
}

async function replaceArchiveFile(
    temporaryPath: string,
    archiveFilePath: string
): Promise<void> {
    await fs.promises.rm(archiveFilePath, {force: true});
    await fs.promises.rename(temporaryPath, archiveFilePath);
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
