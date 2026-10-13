import * as fs from "fs";
import * as path from "path";

import { spawn, spawnSync } from "child_process";

import { createTemporaryDirectory, removeTemporaryDirectory} from "./cli/tempDirectory";

export interface GpgPasswordChangeOptions {
    currentPassword?: string;
    newPassword?: string;
    createBackup?: boolean;
}

export interface GpgPasswordChangeResult {
    encrypted: boolean;
    backupPath?: string;
}

export async function changeGpgPassword(
    filePath: string,
    options: GpgPasswordChangeOptions
): Promise<GpgPasswordChangeResult> {
    const originalStat = await fs.promises.stat(filePath);
    const temporaryDirectory = createTemporaryDirectory("sato-gpg-password-");
    const gpgHome = path.join(temporaryDirectory, "gnupg");
    const verificationHome = path.join(temporaryDirectory, "verification-gnupg");
    const importedKeyPath = path.join(temporaryDirectory, "private-key-input");
    const outputPath = path.join(temporaryDirectory, "private-key-output");
    const verificationExportPath = path.join(temporaryDirectory, "verification-export");
    const rollbackPath = createRollbackPath(filePath);
    const backupPath = options.createBackup === true ? `${filePath}.bak` : undefined;

    fs.mkdirSync(gpgHome, {recursive: true, mode: 0o700});
    fs.mkdirSync(verificationHome, {recursive: true, mode: 0o700 });

    await fs.promises.copyFile(filePath, importedKeyPath);
    await fs.promises.chmod(importedKeyPath, 0o600);
    await fs.promises.copyFile(filePath, rollbackPath);

    try {
        importPrivateKey(gpgHome, importedKeyPath);
        const fingerprint = readPrivateKeyFingerprint(gpgHome);
        await updateGpgPassword(gpgHome, fingerprint, options.currentPassword || "", options.newPassword || "");
        killGpgAgent(gpgHome);
        exportPrivateKey(gpgHome, fingerprint, options.newPassword || "", outputPath, isArmoredPrivateKey(filePath));
        verifyExportedPrivateKey(outputPath, verificationHome, verificationExportPath, options.newPassword || "");

        if (backupPath) {
            await fs.promises.copyFile( filePath, backupPath);
            await preserveMetadata(backupPath, originalStat);
        }

        await replaceFile(outputPath, filePath);
        await preserveMetadata(filePath, originalStat);

        return {
            encrypted: Boolean(options.newPassword),
            backupPath
        };

    } catch (error) {
        await restoreOriginalFile(rollbackPath, filePath, originalStat);
        throw error;

    } finally {
        killGpgAgent(gpgHome);
        killGpgAgent(verificationHome);

        await fs.promises.rm(rollbackPath, {force: true});
        removeTemporaryDirectory(temporaryDirectory);
    }
}

function importPrivateKey(
    gpgHome: string,
    privateKeyPath: string
): void {
    const result = spawnSync(
        "gpg",
        ["--homedir", gpgHome, "--batch", "--yes", "--no-tty", "--import", privateKeyPath],
        {encoding: "utf8", timeout: 30000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
    );

    requireGpgSuccess(result, "Failed to import the OpenPGP private key.");
}

function readPrivateKeyFingerprint(
    gpgHome: string
): string {
    const result = spawnSync(
        "gpg",
        ["--homedir", gpgHome, "--batch", "--no-tty", "--with-colons", "--list-secret-keys"],
        {encoding: "utf8", timeout: 30000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
    );

    requireGpgSuccess(result, "Failed to inspect the OpenPGP private key.");
    const lines = String(result.stdout || "").split(/\r?\n/);

    let secretKeySeen = false;

    for (const line of lines) {
        const fields = line.split(":");

        if (fields[0] === "sec") {
            secretKeySeen = true;
            continue;
        }

        if (secretKeySeen && fields[0] === "fpr" && fields[9]) {
            return fields[9];
        }
    }

    throw new Error("No OpenPGP private-key fingerprint was found.");
}

function updateGpgPassword(
    gpgHome: string,
    fingerprint: string,
    currentPassword: string,
    newPassword: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(
            "gpg",
            ["--homedir", gpgHome, "--batch", "--yes", "--no-tty", "--pinentry-mode", "loopback", "--status-fd", "2", "--command-fd", "0", "--passwd", fingerprint],
            { windowsHide: true, stdio: [ "pipe", "pipe", "pipe" ]}
        );

        const answers = currentPassword ? [ currentPassword, newPassword ] : [newPassword];

        let answerIndex = 0;
        let statusBuffer = "";
        let statusOutput = "";
        let standardError = "";
        let settled = false;

        const fail = (error: Error): void => {
            if (settled) {
                return;
            }

            settled = true;
            reject(error);
        };

        const succeed = (): void => {
            if (settled) {
                return;
            }

            settled = true;
            resolve();
        };

        const processStatusLine = (line: string): void => {
            if (!line.includes("[GNUPG:] GET_HIDDEN")) {
                return;
            }

            const answer = answers[answerIndex];

            if (answer === undefined) {
                fail(new Error("GPG requested an unexpected additional passphrase."));

                child.kill();
                return;
            }

            answerIndex++;
            child.stdin.write(`${answer}\n`);
        };

        child.stderr.setEncoding("utf8");

        child.stderr.on("data", chunk => {
            const text = String(chunk);

            statusOutput += text;
            standardError += text;
            statusBuffer += text;

            const lines = statusBuffer.split(/\r?\n/);
            statusBuffer = lines.pop() || "";

            for (const line of lines) {
                processStatusLine(line);
            }
        });

        child.on("error", error => {fail(error);});

        child.on("close", code => {
            if (statusBuffer) {
                processStatusLine(statusBuffer);
            }

            child.stdin.end();

            if (settled) {
                return;
            }

            if (code !== 0 || !statusOutput.includes("[GNUPG:] SUCCESS keyedit.passwd")) {
                const message = sanitizeGpgError(standardError);
                fail(new Error(message || "Failed to update the OpenPGP private-key password."));

                return;
            }

            succeed();
        });
    });
}

function exportPrivateKey(
    gpgHome: string,
    fingerprint: string,
    password: string,
    outputPath: string,
    armored: boolean
): void {
    const args = ["--homedir", gpgHome, "--batch", "--yes", "--no-tty", "--pinentry-mode", "loopback", "--passphrase-fd", "0"];

    if (armored) {
        args.push("--armor");
    }

    args.push("--output", outputPath, "--export-secret-keys", fingerprint);
    const result = spawnSync("gpg", args, {input: `${password}\n`, encoding: "utf8", timeout: 30000, maxBuffer: 16 * 1024 * 1024, windowsHide: true});
    requireGpgSuccess(result, "Failed to export the updated OpenPGP private key.");
    requireRegularOutput(outputPath, "GPG did not create the updated private-key file.");
}

function verifyExportedPrivateKey(
    privateKeyPath: string,
    verificationHome: string,
    verificationExportPath: string,
    password: string
): void {
    importPrivateKey(verificationHome, privateKeyPath);
    const fingerprint = readPrivateKeyFingerprint(verificationHome);
    exportPrivateKey(verificationHome, fingerprint, password, verificationExportPath, false);
    requireRegularOutput(verificationExportPath, "Failed to verify the updated OpenPGP private key.");
}

function isArmoredPrivateKey(
    filePath: string
): boolean {
    const prefix = fs.readFileSync(filePath).subarray(0, 128).toString("utf8");
    return prefix.includes("-----BEGIN PGP PRIVATE KEY BLOCK-----");
}

function requireGpgSuccess(
    result: ReturnType<typeof spawnSync>,
    fallbackMessage: string
): void {
    if (!result.error && result.status === 0) {
        return;
    }

    const message = sanitizeGpgError(String(result.stderr || result.error?.message || ""));
    throw new Error(message || fallbackMessage);
}

function sanitizeGpgError(
    value: string
): string {
    return value.split(/\r?\n/).filter(line =>
        !line.startsWith("[GNUPG:]") &&
        !line.includes("GET_HIDDEN") &&
        !line.includes("GOT_IT")).join("\n").trim();
}

function requireRegularOutput(
    filePath: string,
    message: string
): void {
    if (!fs.existsSync(filePath)) {
        throw new Error(message);
    }

    const stat =fs.statSync(filePath);

    if (!stat.isFile() || stat.size === 0) {
        throw new Error(message);
    }
}

function killGpgAgent(
    gpgHome: string
): void {
    if (!gpgHome) {
        return;
    }

    spawnSync("gpgconf", ["--homedir", gpgHome, "--kill", "gpg-agent"], {encoding: "utf8", timeout: 5000, windowsHide: true});
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
    try {
        await fs.promises.copyFile(rollbackPath, filePath);
        await preserveMetadata(filePath, originalStat);

    } catch {
        // Preserve the original operation error.
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
