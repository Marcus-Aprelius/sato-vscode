import * as fs from "fs";
import * as path from "path";

import { spawnSync } from "child_process";
import { createTemporaryDirectory } from "./cli/tempDirectory";
import { describeError } from "../utils/errors";

export interface Pkcs12PasswordChangeOptions {
    currentPassword?: string;
    newPassword?: string;
    createBackup?: boolean;
}

export interface Pkcs12PasswordChangeResult {
    encrypted: boolean;
    backupPath?: string;
}

export async function changePkcs12Password(
    filePath: string,
    options: Pkcs12PasswordChangeOptions
): Promise<Pkcs12PasswordChangeResult> {
    const originalStat = await fs.promises.stat(filePath);
    const temporaryDirectory = createTemporaryDirectory("sato-pkcs12-password-");
    const extractedPemPath = path.join(temporaryDirectory, "contents.pem");
    const outputPath = path.join(temporaryDirectory, path.basename(filePath));
    const rollbackPath = createRollbackPath(filePath);
    const backupPath = options.createBackup === true ? `${filePath}.bak` : undefined;
    let originalFileModified = false;
    let preserveRollback = false;
    let operationFailed = false;
    let operationError: unknown;
    const cleanupErrors: unknown[] = [];

    try {
        await fs.promises.copyFile(filePath, rollbackPath);
        extractPkcs12Contents(filePath, extractedPemPath, options.currentPassword || "");
        createPkcs12Container(extractedPemPath, outputPath, options.newPassword || "");
        verifyPkcs12Container(outputPath, options.newPassword || "");

        if (backupPath) {
            await fs.promises.copyFile(filePath, backupPath);
            await preserveMetadata(backupPath, originalStat);
        }

        originalFileModified = true;
        await replaceFile(outputPath, filePath);
        await preserveMetadata(filePath, originalStat);

    } catch (error) {
        operationFailed = true;
        operationError = error;

        if (originalFileModified) {
            try {
                await restoreOriginalFile(rollbackPath, filePath, originalStat);
            } catch (restoreError) {
                preserveRollback = true;
                operationError = new Error(
                    `Failed to restore the original PKCS#12 file. The rollback copy was preserved at "${path.resolve(rollbackPath)}".`,
                    {cause: new AggregateError([error, restoreError], "PKCS#12 password change and rollback both failed.")}
                );
            }
        }
    }

    if (!preserveRollback) {
        try {
            await fs.promises.rm(rollbackPath, {force: true});
        } catch (error) {
            cleanupErrors.push(error);
        }
    }

    try {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    } catch (error) {
        cleanupErrors.push(error);
    }

    if (operationFailed) {
        if (cleanupErrors.length > 0) {
            throw new AggregateError(
                [operationError, ...cleanupErrors],
                describeError(operationError),
                {cause: operationError}
            );
        }

        throw operationError;
    }

    if (cleanupErrors.length > 0) {
        throw new AggregateError(
            cleanupErrors,
            "The PKCS#12 password operation could not remove temporary or rollback files. The password may have changed."
        );
    }

    return {encrypted: Boolean(options.newPassword), backupPath};
}

function extractPkcs12Contents(
    inputPath: string,
    outputPath: string,
    password: string
): void {
    const result = spawnSync(
        "openssl",
        ["pkcs12", "-in", inputPath, "-out", outputPath, "-nodes", "-passin", `pass:${password}`],
        {encoding: "utf8", timeout: 30000, maxBuffer: 32 * 1024 * 1024, windowsHide: true}
    );

    requireOpenSslSuccess(result, "Failed to read the PKCS#12 container.");

    if (!fs.existsSync(outputPath)) {
        throw new Error("OpenSSL did not extract the PKCS#12 contents.");
    }
}

function createPkcs12Container(
    inputPemPath: string,
    outputPath: string,
    password: string
): void {
    const result = spawnSync(
        "openssl",
        ["pkcs12", "-export", "-in", inputPemPath, "-out", outputPath, "-passout", `pass:${password}`],
        {encoding: "utf8", timeout: 30000, maxBuffer: 32 * 1024 * 1024, windowsHide: true}
    );

    requireOpenSslSuccess(result, "Failed to create the updated PKCS#12 container.");

    if (!fs.existsSync(outputPath)) {
        throw new Error("OpenSSL did not create the updated PKCS#12 container.");
    }
}

function verifyPkcs12Container(
    filePath: string,
    password: string
): void {
    const result = spawnSync(
        "openssl",
        ["pkcs12", "-in", filePath, "-info", "-noout", "-passin", `pass:${password}`],
        {encoding: "utf8", timeout: 30000, maxBuffer: 32 * 1024 * 1024, windowsHide: true}
    );

    requireOpenSslSuccess(result, "Failed to verify the updated PKCS#12 container.");
}

function requireOpenSslSuccess(
    result: ReturnType<typeof spawnSync>,
    fallbackMessage: string
): void {
    if (!result.error && result.status === 0) {
        return;
    }

    const message = String(result.stderr || result.stdout || result.error?.message || fallbackMessage).trim();
    throw new Error(message || fallbackMessage);
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
    await fs.promises.copyFile(temporaryPath, filePath);
}

async function restoreOriginalFile(
    rollbackPath: string,
    filePath: string,
    originalStat: fs.Stats
): Promise<void> {
    await fs.promises.copyFile(rollbackPath, filePath);
    await preserveMetadata(filePath, originalStat);
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
