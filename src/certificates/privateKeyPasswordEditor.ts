import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export interface PrivateKeyPasswordChangeOptions { currentPassword?: string; newPassword?: string; createBackup?: boolean;}
export interface PrivateKeyPasswordChangeResult { encrypted: boolean; backupPath?: string;}

export async function changePrivateKeyPassword(
    filePath: string,
    options: PrivateKeyPasswordChangeOptions
): Promise<PrivateKeyPasswordChangeResult> {
    const originalStat = await fs.promises.stat(filePath);
    const originalBytes = await fs.promises.readFile(filePath);
    const encoding = detectKeyEncoding(originalBytes);
    const privateKey = crypto.createPrivateKey({key: originalBytes, format: encoding, passphrase: options.currentPassword || undefined});
    const output = exportPrivateKey(privateKey, encoding, options.newPassword);

    verifyPrivateKey(output, encoding, options.newPassword);

    const temporaryPath = createTemporaryPath(filePath);
    const rollbackPath = createRollbackPath(filePath);
    const backupPath = options.createBackup === true ? `${filePath}.bak` : undefined;

    await fs.promises.copyFile(filePath, rollbackPath);

    try {
        await fs.promises.writeFile(temporaryPath, output, {flag: "wx", mode: originalStat.mode & 0o7777});
        await preserveFileMetadata(temporaryPath, originalStat);

        if (backupPath) {
            await fs.promises.copyFile(filePath, backupPath);
            await preserveFileMetadata(backupPath,originalStat);
        }

        await replaceFile(temporaryPath, filePath);
        await preserveFileMetadata(filePath, originalStat);
        await fs.promises.rm(rollbackPath, {force: true});

        return {
            encrypted: Boolean(options.newPassword),
            backupPath
        };

    } catch (error) {
        await fs.promises.rm(temporaryPath, {force: true});
        await fs.promises.copyFile(rollbackPath, filePath);
        await preserveFileMetadata(filePath, originalStat);
        await fs.promises.rm(rollbackPath, {force: true});

        throw error;
    }
}

function detectKeyEncoding(
    bytes: Buffer
): "pem" | "der" {
    const prefix = bytes.subarray(0, Math.min(bytes.length, 128)).toString("utf8");
    return prefix.includes("-----BEGIN ") ? "pem" : "der";
}

function exportPrivateKey(
    privateKey: crypto.KeyObject,
    encoding: "pem" | "der",
    password?: string
): string | Buffer {
    if (encoding === "pem") {
        return password
            ? privateKey.export({type: "pkcs8", format: "pem", cipher: "aes-256-cbc", passphrase: password})
            : privateKey.export({type: "pkcs8", format: "pem"});
    }

    return password
        ? privateKey.export({type: "pkcs8", format: "der", cipher: "aes-256-cbc", passphrase: password})
        : privateKey.export({type: "pkcs8", format: "der"});
}

function verifyPrivateKey(
    key: string | Buffer,
    format: "pem" | "der",
    password?: string
): void {
    crypto.createPrivateKey({key, format, passphrase: password || undefined});
}

function createTemporaryPath(
    filePath: string
): string {
    return path.join(path.dirname(filePath), `.${path.basename(filePath)}.` + `${process.pid}.${Date.now()}.password.tmp`);
}

function createRollbackPath(
    filePath: string
): string {
    return path.join(path.dirname(filePath), `.${path.basename(filePath)}.` + `${process.pid}.${Date.now()}.rollback`);
}

async function replaceFile(
    temporaryPath: string,
    filePath: string
): Promise<void> {
    await fs.promises.rm(filePath, {force: true});
    await fs.promises.rename(temporaryPath, filePath);
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
