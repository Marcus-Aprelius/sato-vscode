import * as fs from "fs";
import * as path from "path";

import { spawnSync } from "child_process";

export interface SshKeyPasswordChangeOptions {
    currentPassword?: string;
    newPassword?: string;
    createBackup?: boolean;
}

export async function changeSshKeyPassword(
    filePath: string,
    options: SshKeyPasswordChangeOptions
): Promise<{encrypted: boolean; backupPath?: string}> {
    const originalStat = await fs.promises.stat(filePath);
    const temporaryPath = createTemporaryPath(filePath);
    const backupPath = options.createBackup ? `${filePath}.bak` : undefined;

    await fs.promises.copyFile(filePath, temporaryPath);
    await fs.promises.chmod(temporaryPath, 0o600);

    try {
        const result = spawnSync(
            "ssh-keygen",
            ["-p", "-P", options.currentPassword || "", "-N", options.newPassword || "", "-f", temporaryPath ],
            { encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }
        );

        if (result.error || result.status !== 0) {
            throw new Error((result.stderr || result.stdout || result.error?.message || "ssh-keygen failed.").trim());
        }

        verifyKey(temporaryPath, options.newPassword || "");

        if (backupPath) {
            await fs.promises.copyFile(filePath, backupPath);
            await preserveMetadata(backupPath, originalStat);
        }

        await fs.promises.copyFile(temporaryPath, filePath);
        await preserveMetadata(filePath, originalStat);

        return {encrypted: Boolean(options.newPassword), backupPath};

    } finally {
        await fs.promises.rm(temporaryPath, {force: true});
    }
}

function verifyKey(
    filePath: string,
    password: string
): void {
    const result = spawnSync("ssh-keygen", ["-y", "-P", password, "-f", filePath],
        { encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true}
    );

    if (result.error || result.status !== 0 || !result.stdout?.trim()) {
        throw new Error("Failed to verify the updated OpenSSH private key.");
    }
}

function createTemporaryPath(
    filePath: string
): string {
    return path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.password.tmp`);
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
