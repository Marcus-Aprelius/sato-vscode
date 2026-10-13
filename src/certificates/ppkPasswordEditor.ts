import * as fs from "fs";
import * as path from "path";

import { spawnSync } from "child_process";
import { createTemporaryDirectory, removeTemporaryDirectory} from "./cli/tempDirectory";

export interface PpkPasswordChangeOptions {
    currentPassword?: string;
    newPassword?: string;
    createBackup?: boolean;
}

export async function changePpkPassword(
    filePath: string,
    options: PpkPasswordChangeOptions
): Promise<{encrypted: boolean; backupPath?: string;}> {
    const originalStat = await fs.promises.stat(filePath);
    const temporaryDirectory = createTemporaryDirectory("sato-ppk-password-");
    const temporaryKeyPath = path.join(temporaryDirectory, "private-key.ppk");
    const oldPasswordPath = path.join(temporaryDirectory, "old-passphrase.txt");
    const newPasswordPath = path.join(temporaryDirectory, "new-passphrase.txt");
    const backupPath = options.createBackup ? `${filePath}.bak` : undefined;

    try {
        await fs.promises.copyFile(filePath, temporaryKeyPath);
        await fs.promises.chmod(temporaryKeyPath, 0o600);
        await fs.promises.writeFile(oldPasswordPath, `${options.currentPassword || ""}\n`, { encoding: "utf8", mode: 0o600 });
        await fs.promises.writeFile(newPasswordPath, `${options.newPassword || ""}\n`, { encoding: "utf8", mode: 0o600 });

        const result = spawnSync(
            "puttygen",
            [temporaryKeyPath, "-P", "--old-passphrase", oldPasswordPath, "--new-passphrase", newPasswordPath],
            { encoding: "utf8", timeout: 30000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }
        );

        if (result.error || result.status !== 0) {
            throw new Error((result.stderr || result.stdout || result.error?.message || "puttygen failed.").trim());
        }

        verifyPpkPassword(temporaryKeyPath, options.newPassword || "");

        if (backupPath) {
            await fs.promises.copyFile(filePath, backupPath);
            await preserveMetadata(backupPath, originalStat);
        }

        await fs.promises.copyFile(temporaryKeyPath, filePath);
        await preserveMetadata(filePath, originalStat);

        return {
            encrypted: Boolean(options.newPassword),
            backupPath
        };

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}

function verifyPpkPassword(
    filePath: string,
    password: string
): void {
    const temporaryDirectory = createTemporaryDirectory("sato-ppk-verify-");
    const outputPath = path.join(temporaryDirectory, "private-key.pem");
    const passwordPath = path.join(temporaryDirectory, "passphrase.txt");

    try {
        fs.writeFileSync(passwordPath, `${password}\n`, {encoding: "utf8", mode: 0o600});

        const result = spawnSync(
            "puttygen",
            [filePath, "-O", "private-openssh", "-o", outputPath, "--old-passphrase", passwordPath],
            { encoding: "utf8", timeout: 30000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }
        );

        if (result.error ||result.status !== 0 || !fs.existsSync(outputPath)) {
            throw new Error("Failed to verify the updated PuTTY private key.");
        }

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}

async function preserveMetadata(
    filePath: string,
    originalStat: fs.Stats
): Promise<void> {
    await fs.promises.chmod(filePath, originalStat.mode & 0o7777);

    if (process.platform !== "win32") {
        await fs.promises.chown(filePath, originalStat.uid, originalStat.gid);}

    await fs.promises.utimes(filePath, originalStat.atime, originalStat.mtime);
}
