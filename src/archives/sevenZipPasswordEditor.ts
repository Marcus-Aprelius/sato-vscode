import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";

import type { ArchiveFormat } from "./types";
import type { ZipPasswordChangeOptions, ZipPasswordChangeResult } from "./zipPasswordEditor";

export async function changeSevenZipPassword(
    archivePath: string,
    format: ArchiveFormat,
    options: ZipPasswordChangeOptions
): Promise<ZipPasswordChangeResult> {
    const originalStat = await fs.promises.stat(archivePath);
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-password-"));
    const outputPath = `${archivePath}.${process.pid}.${Date.now()}.tmp`;
    const rollbackPath = `${archivePath}.${process.pid}.${Date.now()}.rollback`;
    const backupPath = options.createBackup === true ? `${archivePath}.bak` : undefined;

    await fs.promises.copyFile(archivePath, rollbackPath);

    try {
        await extractArchive(archivePath, temporaryDirectory, options.currentPassword);
        await createArchive(outputPath, temporaryDirectory, format, options.newPassword);
        await verifyArchive(outputPath, options.newPassword);

        if (backupPath) {
            await fs.promises.copyFile(archivePath, backupPath);
            await preserveFileMetadata(backupPath, originalStat);
        }

        await fs.promises.rm(archivePath, {force: true});
        await fs.promises.rename(outputPath, archivePath);
        await preserveFileMetadata(archivePath, originalStat);
        await fs.promises.rm(rollbackPath, {force: true});

        return {encrypted: Boolean(options.newPassword), backupPath};

    } catch (error) {
        await fs.promises.rm(outputPath, {force: true});
        await fs.promises.copyFile(rollbackPath, archivePath);
        await preserveFileMetadata(archivePath, originalStat);
        await fs.promises.rm(rollbackPath, {force: true});

        throw error;

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function extractArchive(
    archivePath: string,
    destination: string,
    password: string
): Promise<void> {
    const result = await runSevenZip(["x", archivePath, `-o${destination}`, password ? `-p${password}` : "-p-", "-y", "-bd", "-bso1", "-bse1"]);
    requireSuccess(result);
}

async function createArchive(
    outputPath: string,
    sourceDirectory: string,
    format: ArchiveFormat,
    password?: string
): Promise<void> {
    const args = ["a", format === "7z" ? "-t7z" : "-tzip", outputPath, ".", "-y", "-bd", "-bso1", "-bse1"];

    if (password) {
        args.push(`-p${password}`);

        if (format === "7z") {
            args.push("-mhe=on");
        } else {
            args.push("-mem=AES256");
        }
    }

    const result = await runSevenZip(args, undefined, {cwd: sourceDirectory});
    requireSuccess(result);
}

async function verifyArchive(
    archivePath: string,
    password?: string
): Promise<void> {
    const result = await runSevenZip(["t", archivePath, password ? `-p${password}` : "-p-", "-y", "-bd", "-bso1", "-bse1"]);
    requireSuccess(result);
}

function requireSuccess(
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
