import * as fs from "fs";
import * as path from "path";

import { spawnSync } from "child_process";

export interface JksPasswordChangeOptions {
    currentPassword: string;
    newPassword: string;
    createBackup?: boolean;
}

export async function changeJksPassword(
    filePath: string,
    options: JksPasswordChangeOptions
): Promise<{
    backupPath?: string;
}> {
    const originalStat = await fs.promises.stat(filePath);
    const temporaryPath = createTemporaryPath(filePath);
    const backupPath = options.createBackup === true ? `${filePath}.bak` : undefined;

    await fs.promises.copyFile(filePath, temporaryPath);
    await fs.promises.chmod(temporaryPath, 0o600);

    try {
        const result = spawnSync(
            "keytool",
            ["-storepasswd", "-storetype", keyStoreType(filePath), "-keystore", temporaryPath, "-storepass", options.currentPassword, "-new", options.newPassword],
            {encoding: "utf8", timeout: 30000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
        );

        if (result.error || result.status !== 0) {
            throw new Error((result.stderr || result.stdout || result.error?.message || "keytool failed.").trim());
        }

        verifyJksPassword(temporaryPath, options.newPassword, keyStoreType(filePath));

        if (backupPath) {
            await fs.promises.copyFile(filePath, backupPath);
            await preserveMetadata(backupPath, originalStat);
        }

        await fs.promises.copyFile(temporaryPath, filePath);
        await preserveMetadata(filePath, originalStat);

        return {backupPath};

    } finally {
        await fs.promises.rm(temporaryPath, {force: true});
    }
}

function verifyJksPassword(
    filePath: string,
    password: string,
    storeType: string
): void {
    const result = spawnSync(
        "keytool",
        ["-list", "-storetype", storeType, "-keystore", filePath, "-storepass", password],
        {encoding: "utf8", timeout: 30000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
    );

    if (result.error || result.status !== 0) {
        throw new Error("Failed to verify the updated Java KeyStore.");
    }
}

function keyStoreType(
    filePath: string
): "JKS" | "JCEKS" {
    return filePath.toLowerCase().endsWith(".jceks") ? "JCEKS" : "JKS";
}

function createTemporaryPath(
    filePath: string
): string {
    return path.join(path.dirname(filePath), `.${path.basename(filePath)}.` + `${process.pid}.${Date.now()}.password.tmp`);
}

async function preserveMetadata(
    filePath: string,
    originalStat: fs.Stats
): Promise<void> {
    await fs.promises.chmod(filePath, originalStat.mode & 0o7777);

    if (process.platform !== "win32") {
        await fs.promises.chown(filePath, originalStat.uid,originalStat.gid);
    }

    await fs.promises.utimes(filePath, originalStat.atime, originalStat.mtime);
}
