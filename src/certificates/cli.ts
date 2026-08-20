import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as childProcess from "child_process";

export interface CommandResult {
    ok: boolean;
    text: string;
    stdout?: string;
    stderr?: string;
}

export function isCommandAvailable(command: string): boolean {
    const result = childProcess.spawnSync(
        process.platform === "win32" ? "where" : "which",
        [command],
        {
            encoding: "utf8",
            timeout: 3000
        }
    );

    return !result.error && result.status === 0;
}

export function tryInspectCsrWithOpenSsl(
    text: string
): Record<string, string> | undefined {
    try {
        const tmp = fs.mkdtempSync(
            path.join(os.tmpdir(), "sato-csr-")
        );

        const csrPath = path.join(tmp, "request.csr");

        try {
            fs.writeFileSync(csrPath, text, "utf8");

            const output = childProcess.execFileSync(
                "openssl",
                ["req", "-in", csrPath, "-text", "-noout"],
                {
                    encoding: "utf8",
                    timeout: 3000
                }
            );

            return {
                Details: output
            };
        } finally {
            fs.rmSync(tmp, {
                recursive: true,
                force: true
            });
        }
    } catch {
        return undefined;
    }
}

export function runWithTempFile(
    bytes: Uint8Array,
    fileName: string,
    command: string,
    argsFactory: (tmpFile: string) => string[]
): CommandResult {
    let tmp = "";

    try {
        tmp = fs.mkdtempSync(
            path.join(os.tmpdir(), "sato-crypto-")
        );

        const tmpFile = path.join(tmp, fileName);

        fs.writeFileSync(tmpFile, Buffer.from(bytes));

        const result = childProcess.spawnSync(
            command,
            argsFactory(tmpFile),
            {
                encoding: "utf8",
                timeout: 5000
            }
        );

        const stdout = result.stdout || "";
        const stderr = result.stderr || "";
        const text = `${stdout}\n${stderr}`.trim();

        if (result.error || result.status !== 0) {
            return {
                ok: false,
                text
            };
        }

        return {
            ok: true,
            text
        };
    } catch {
        return {
            ok: false,
            text: ""
        };
    } finally {
        if (tmp) {
            fs.rmSync(tmp, {
                recursive: true,
                force: true
            });
        }
    }
}

export function decryptGpgWithPrivateKey(
    encryptedBytes: Uint8Array,
    privateKeyBytes: Uint8Array,
    password: string
): CommandResult {
    let tmp = "";

    try {
        tmp = fs.mkdtempSync(
            path.join(os.tmpdir(), "sato-gpg-")
        );

        const gpgHome = path.join(tmp, "gnupg");
        const encryptedFile = path.join(tmp, "encrypted.gpg");
        const privateKeyFile = path.join(tmp, "private-key.asc");

        fs.mkdirSync(gpgHome, {
            recursive: true,
            mode: 0o700
        });

        fs.writeFileSync(
            encryptedFile,
            Buffer.from(encryptedBytes),
            {
                mode: 0o600
            }
        );

        fs.writeFileSync(
            privateKeyFile,
            Buffer.from(privateKeyBytes),
            {
                mode: 0o600
            }
        );

        const importResult = childProcess.spawnSync(
            "gpg",
            [
                "--homedir",
                gpgHome,
                "--batch",
                "--no-tty",
                "--import",
                privateKeyFile
            ],
            {
                encoding: "utf8",
                timeout: 10000
            }
        );

        const importStdout = importResult.stdout || "";
        const importStderr = importResult.stderr || "";

        if (importResult.error || importResult.status !== 0) {
            return {
                ok: false,
                text: `${importStdout}\n${importStderr}`.trim(),
                stdout: importStdout,
                stderr: importStderr
            };
        }

        const decryptResult = childProcess.spawnSync(
            "gpg",
            [
                "--homedir",
                gpgHome,
                "--batch",
                "--yes",
                "--no-tty",
                "--pinentry-mode",
                "loopback",
                "--passphrase-fd",
                "0",
                "--decrypt",
                encryptedFile
            ],
            {
                encoding: "utf8",
                timeout: 15000,
                input: `${password}\n`
            }
        );

        const stdout = decryptResult.stdout || "";
        const stderr = decryptResult.stderr || "";
        const text = `${stdout}\n${stderr}`.trim();

        return {
            ok:
                !decryptResult.error &&
                decryptResult.status === 0,
            text,
            stdout,
            stderr
        };
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : String(error);

        return {
            ok: false,
            text: message,
            stdout: "",
            stderr: message
        };
    } finally {
        if (tmp) {
            const gpgHome = path.join(tmp, "gnupg");

            childProcess.spawnSync(
                "gpgconf",
                [
                    "--homedir",
                    gpgHome,
                    "--kill",
                    "gpg-agent"
                ],
                {
                    encoding: "utf8",
                    timeout: 3000
                }
            );

            fs.rmSync(tmp, {
                recursive: true,
                force: true
            });
        }
    }
}
