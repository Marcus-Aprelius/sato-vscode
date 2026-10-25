import * as fs from "fs";
import * as path from "path";

import {spawnSync} from "child_process";
import { createTemporaryDirectory, removeTemporaryDirectory } from "./cli/tempDirectory";

export interface LuksPasswordChangeOptions {
    currentPassword: string;
    newPassword: string;
    createBackup?: boolean;
}

export interface LuksPasswordChangeResult {
    backupPath?: string;
}

export async function changeLuksPassword(
    filePath: string,
    options: LuksPasswordChangeOptions
): Promise<LuksPasswordChangeResult> {
    if (!options.currentPassword) {
        throw new Error("The current LUKS password is required.");
    }

    if (!options.newPassword) {
        throw new Error("The new LUKS password is required.");
    }

    if (options.currentPassword === options.newPassword) {
        throw new Error("The new LUKS password must differ " + "from the current password.");
    }

    const originalStat = await fs.promises.stat(filePath);
    const temporaryDirectory = createTemporaryDirectory("sato-luks-password-");
    const currentPasswordPath = path.join(temporaryDirectory, "current-password");
    const newPasswordPath = path.join(temporaryDirectory, "new-password");
    const headerBackupPath = path.join(temporaryDirectory, "luks-header-backup");
    const backupPath = options.createBackup === true ? `${filePath}.bak` : undefined;

    try {
        writePasswordFile(currentPasswordPath, options.currentPassword);
        writePasswordFile(newPasswordPath, options.newPassword);
        verifyLuksPassword(filePath, currentPasswordPath, "The current LUKS password is incorrect.");
        backupLuksHeader(filePath, headerBackupPath );

        if (backupPath) {
            await fs.promises.copyFile(filePath, backupPath);
            await preserveMetadata(backupPath, originalStat);
        }

        try {
            updateLuksPassword(filePath, currentPasswordPath, newPasswordPath);
            verifyLuksPassword(filePath, newPasswordPath, "Failed to verify the updated LUKS password.");

        } catch (error) {
            restoreLuksHeader(filePath, headerBackupPath);
            verifyLuksPassword(filePath, currentPasswordPath, "The LUKS header was restored, " + "but the original password could not be verified.");

            throw error;
        }

        await preserveMetadata(filePath, originalStat);
        return {backupPath};

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}

function writePasswordFile(
    filePath: string,
    password: string
): void {
    fs.writeFileSync(filePath, Buffer.from(`${password}\n`, "utf8"), {mode: 0o600, flag: "wx"});
}

function verifyLuksPassword(
    filePath: string,
    passwordPath: string,
    errorMessage: string
): void {
    const result = spawnSync(
        "cryptsetup",
        ["open", "--test-passphrase", "--key-file", passwordPath, filePath],
        {encoding: "utf8", timeout: 120000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
    );

    if (result.error || result.status !== 0) {
        throw new Error(errorMessage);
    }
}

function backupLuksHeader(
    filePath: string,
    headerBackupPath: string
): void {
    const result = spawnSync(
        "cryptsetup",
        ["luksHeaderBackup", "--header-backup-file", headerBackupPath, filePath],
        {encoding: "utf8", timeout: 120000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
    );

    requireCryptsetupSuccess(result, "Failed to create the temporary LUKS header backup.");
    requireRegularOutput(headerBackupPath, "cryptsetup did not create the LUKS header backup.");

    fs.chmodSync(headerBackupPath, 0o600);
}

function updateLuksPassword(
    filePath: string,
    currentPasswordPath: string,
    newPasswordPath: string
): void {
    const result = spawnSync(
        "cryptsetup",
        ["luksChangeKey", "--batch-mode", "--key-file", currentPasswordPath, filePath, newPasswordPath],
        {encoding: "utf8", timeout: 120000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
    );

    requireCryptsetupSuccess(result, "Failed to change the LUKS password.");
}

function restoreLuksHeader(
    filePath: string,
    headerBackupPath: string
): void {
    const result = spawnSync(
        "cryptsetup",
        ["luksHeaderRestore", "--batch-mode", "--header-backup-file", headerBackupPath, filePath],
        {encoding: "utf8", timeout: 120000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
    );

    requireCryptsetupSuccess(result, "Failed to restore the original LUKS header.");
}

function requireCryptsetupSuccess(
    result: ReturnType<typeof spawnSync>,
    fallbackMessage: string
): void {
    if (!result.error && result.status === 0) {
        return;
    }

    const message = String(result.stderr || result.stdout || result.error?.message || "").trim();
    throw new Error(message || fallbackMessage);
}

function requireRegularOutput(
    filePath: string,
    message: string
): void {
    if (!fs.existsSync(filePath)) {
        throw new Error(message);
    }

    const stat = fs.statSync(filePath);

    if (!stat.isFile() || stat.size === 0) {
        throw new Error(message);
    }
}

async function preserveMetadata(
    filePath: string,
    originalStat: fs.Stats
): Promise<void> {
    await fs.promises.chmod(filePath, originalStat.mode & 0o7777);

    if (process.platform !== "win32") {
        await fs.promises.chown(filePath, originalStat.uid, originalStat.gid);
    }

    await fs.promises.utimes(filePath, originalStat.atime, originalStat.mtime);
}
