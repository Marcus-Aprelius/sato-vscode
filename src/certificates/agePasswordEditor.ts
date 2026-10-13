import * as fs from "fs";
import * as path from "path";

import { spawnSync } from "child_process";
import { createTemporaryDirectory } from "./cli/tempDirectory";

export interface AgePasswordChangeOptions {
    currentPassword: string;
    newPassword: string;
    createBackup?: boolean;
}

export interface AgePasswordChangeResult {
    backupPath?: string;
}

export async function changeAgePassword(
    filePath: string,
    options: AgePasswordChangeOptions
): Promise<AgePasswordChangeResult> {
    if (process.platform !== "linux") {
        throw new Error("Changing age passphrases is currently supported only on Linux.");
    }

    if (!options.currentPassword) {
        throw new Error("The current age password is required.");
    }

    if (!options.newPassword) {
        throw new Error("The new age password is required.");
    }

    ensureAgeUtilitiesAvailable();

    const originalStat = await fs.promises.stat(filePath);
    const temporaryDirectory = createTemporaryDirectory("sato-age-password-");
    const decryptedPath = path.join(temporaryDirectory, "decrypted-content");
    const outputPath = path.join(temporaryDirectory, "updated.age");
    const verificationPath = path.join(temporaryDirectory, "verification-content");
    const rollbackPath = createRollbackPath(filePath);
    const backupPath = options.createBackup === true ? `${filePath}.bak` : undefined;
    let rollbackCreated = false;
    let preserveRollback = false;
    let originalFileModified = false;
    let operationFailed = false;
    let operationError: unknown;
    let cleanupFailed = false;
    const cleanupErrors: unknown[] = [];
    let result: AgePasswordChangeResult | undefined;

    try {
        try {
            await fs.promises.copyFile(filePath, rollbackPath);

        } catch (error) {
            try {
                await fs.promises.rm(rollbackPath, {force: true});
            } catch (cleanupError) {
                rollbackCreated = true;
                preserveRollback = true;
                throw new Error(
                    `Failed to create a rollback copy. A partial rollback file may remain at "${path.resolve(rollbackPath)}".`,
                    {cause: new AggregateError([error, cleanupError], "Rollback copy creation and cleanup both failed.")}
                );
            }

            throw new Error("Failed to create a rollback copy of the age file.", {cause: error});
        }

        rollbackCreated = true;

        try {
            await fs.promises.chmod(rollbackPath, 0o600);

        } catch (error) {
            try {
                await fs.promises.rm(rollbackPath, {force: true});
                rollbackCreated = false;

            } catch (cleanupError) {
                preserveRollback = true;
                throw new Error(
                    `Failed to secure the rollback copy. The rollback file may remain at "${path.resolve(rollbackPath)}".`,
                    {cause: new AggregateError([error, cleanupError], "Rollback permission update and cleanup both failed.")}
                );
            }

            throw new Error("Failed to create a secure rollback copy of the age file.", {cause: error});
        }

        decryptAgeFile(filePath, decryptedPath, options.currentPassword);
        encryptAgeFile(decryptedPath, outputPath, options.newPassword);
        verifyAgeFile(outputPath, verificationPath, decryptedPath, options.newPassword);

        if (backupPath) {
            await fs.promises.copyFile(filePath, backupPath);
            await preserveMetadata(backupPath, originalStat);
        }

        originalFileModified = true;
        await replaceFile(outputPath, filePath);
        await preserveMetadata(filePath, originalStat);

        result = {backupPath};

    } catch (error) {
        operationFailed = true;
        operationError = error;

        if (rollbackCreated && originalFileModified) {
            try {
                await restoreOriginalFile(rollbackPath, filePath, originalStat);
            } catch (restoreError) {
                preserveRollback = true;
                operationError = new Error(
                    `Failed to restore the original age file. The rollback copy was preserved at "${path.resolve(rollbackPath)}".`,
                    {cause: new AggregateError([error, restoreError], "Age password change and rollback both failed.")}
                );
            }
        }
    }

    if (rollbackCreated && !preserveRollback) {
        try {
            await fs.promises.rm(rollbackPath, {force: true});
        } catch (error) {
            cleanupFailed = true;
            cleanupErrors.push(error);
        }
    }

    try {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    } catch (error) {
        cleanupFailed = true;
        cleanupErrors.push(error);
    }

    if (operationFailed) {
        if (cleanupFailed) {
            throw new AggregateError(
                [operationError, ...cleanupErrors],
                errorMessage(operationError),
                {cause: operationError}
            );
        }

        throw operationError;
    }

    if (cleanupFailed) {
        throw new Error(
            "The age passphrase operation could not securely remove temporary or rollback files. The passphrase may have changed."
        );
    }

    if (!result) {
        throw new Error("The age passphrase operation did not complete.");
    }

    return result;
}

function decryptAgeFile(
    inputPath: string,
    outputPath: string,
    password: string
): void {
    const command = ["umask 077;", "age", "--decrypt", "--output", shellQuote(outputPath), shellQuote(inputPath)].join(" ");
    const result = runAgeWithPty(command, `${password}\n`);

    requireAgeSuccess(result, "Failed to decrypt the age file. " + "The current password may be incorrect.");
    requireRegularOutput(outputPath, "age did not create the decrypted temporary file.");
}

function encryptAgeFile(
    inputPath: string,
    outputPath: string,
    password: string
): void {
    const command = ["umask 077;", "age", "--passphrase", "--output", shellQuote(outputPath), shellQuote(inputPath)].join(" ");
    const result = runAgeWithPty(command, `${password}\n${password}\n`);

    requireAgeSuccess(result, "Failed to create the updated age file.");
    requireRegularOutput(outputPath, "age did not create the updated encrypted file.");
}

function verifyAgeFile(
    encryptedPath: string,
    verificationPath: string,
    expectedContentPath: string,
    password: string
): void {
    const command = ["umask 077;", "age", "--decrypt", "--output", shellQuote(verificationPath), shellQuote(encryptedPath)].join(" ");
    const result = runAgeWithPty(command, `${password}\n`);

    requireAgeSuccess(result, "Failed to verify the updated age file.");
    requireRegularOutput( verificationPath, "age did not create the verification file.");

    const expected = fs.readFileSync(expectedContentPath);
    const actual = fs.readFileSync(verificationPath);

    if (!expected.equals(actual)) {
        throw new Error("The verified age content does not match " + "the original decrypted content.");
    }
}

function runAgeWithPty(
    command: string,
    input: string
): ReturnType<typeof spawnSync> {
    return spawnSync(
        "script",
        ["-qfec", command, "/dev/null"],
        {input, stdio: ["pipe", "ignore", "ignore"], timeout: 30000, windowsHide: true, env: {...process.env}}
    );
}

function ensureAgeUtilitiesAvailable(): void {
    const scriptResult = spawnSync("script", ["--version"], {
        stdio: "ignore",
        timeout: 5000,
        windowsHide: true,
        env: {...process.env}
    });

    if ((scriptResult.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
        throw new Error("The Linux script utility was not found.");
    }

    if (scriptResult.error) {
        throw new Error("The Linux script utility could not be started.");
    }

    const ageResult = spawnSync("age", ["--version"], {
        stdio: "ignore",
        timeout: 5000,
        windowsHide: true,
        env: {...process.env}
    });

    if ((ageResult.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
        throw new Error("The age command was not found.");
    }

    if (ageResult.error) {
        throw new Error("The age command could not be started.");
    }
}

function requireAgeSuccess(
    result: ReturnType<typeof spawnSync>,
    fallbackMessage: string
): void {
    if (!result.error && result.status === 0) {
        return;
    }

    // PTY output can echo credentials, so neither output stream is exposed in errors.
    const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
    const message = code === "ETIMEDOUT"
        ? "The age command timed out."
        : code === "ENOENT"
            ? "The Linux script utility was not found."
            : fallbackMessage;

    throw new Error(message);
}

function errorMessage(
    error: unknown
): string {
    return error instanceof Error ? error.message : "Age passphrase change failed.";
}

function requireRegularOutput(
    filePath: string,
    message: string
): void {
    if (!fs.existsSync(filePath)) {
        throw new Error(message);
    }

    const stat = fs.statSync(filePath);

    if (!stat.isFile()) {
        throw new Error(message);
    }

    fs.chmodSync(filePath, 0o600);
}

function shellQuote(
    value: string
): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
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
    await fs.promises.chmod(
        filePath,
        originalStat.mode & 0o7777
    );

    if (process.platform !== "win32") {
        await fs.promises.chown(filePath, originalStat.uid, originalStat.gid);
    }

    await fs.promises.utimes(filePath, originalStat.atime, originalStat.mtime);
}
