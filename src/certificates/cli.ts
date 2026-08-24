import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFileSync, spawnSync } from "child_process";

export interface CommandResult {
    ok: boolean;
    text: string;
    stdout?: string;
    stderr?: string;
}

export function isCommandAvailable(command: string): boolean {
    const result = spawnSync(
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
    content: string | Uint8Array,
    encoding: "PEM" | "DER" = "PEM"
): Record<string, string> | undefined {
    let tmp = "";

    try {
        tmp = fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "sato-csr-"
            )
        );

        const csrPath = path.join(
            tmp,
            encoding === "DER"
                ? "request.p10"
                : "request.csr"
        );

        fs.writeFileSync(
            csrPath,
            typeof content === "string"
                ? content
                : Buffer.from(content)
        );

        const output = execFileSync(
            "openssl",
            [
                "req",
                "-inform",
                encoding,
                "-in",
                csrPath,
                "-text",
                "-noout"
            ],
            {
                encoding: "utf8",
                timeout: 5000,
                windowsHide: true
            }
        );

        return {
            Details: output
        };
    } catch {
        return undefined;
    } finally {
        if (tmp) {
            try {
                fs.rmSync(
                    tmp,
                    {
                        recursive: true,
                        force: true
                    }
                );
            } catch {
                // Ignore temporary file cleanup errors.
            }
        }
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

        const result = spawnSync(
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

        const importResult = spawnSync(
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

        const decryptResult = spawnSync(
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

            spawnSync(
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

export function tryUnlockPpkWithPuttygen(
    bytes: Uint8Array,
    password: string
): string | undefined {
    const temporaryDirectory =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "sato-ppk-"
            )
        );

    const inputPath = path.join(
        temporaryDirectory,
        "private-key.ppk"
    );

    const outputPath = path.join(
        temporaryDirectory,
        "private-key.pem"
    );

    const oldPasswordPath = path.join(
        temporaryDirectory,
        "old-passphrase.txt"
    );

    const newPasswordPath = path.join(
        temporaryDirectory,
        "new-passphrase.txt"
    );

    try {
        fs.writeFileSync(
            inputPath,
            Buffer.from(bytes),
            {
                mode: 0o600
            }
        );

        fs.writeFileSync(
            oldPasswordPath,
            `${password}\n`,
            {
                encoding: "utf8",
                mode: 0o600
            }
        );

        fs.writeFileSync(
            newPasswordPath,
            "\n",
            {
                encoding: "utf8",
                mode: 0o600
            }
        );

        const result = spawnSync(
            "puttygen",
            [
                inputPath,
                "-O",
                "private-openssh",
                "-o",
                outputPath,
                "--old-passphrase",
                oldPasswordPath,
                "--new-passphrase",
                newPasswordPath
            ],
            {
                encoding: "utf8",
                maxBuffer:
                    16 * 1024 * 1024,
                windowsHide: true,
                timeout: 30000
            }
        );

        if (
            result.error ||
            result.status !== 0 ||
            !fs.existsSync(outputPath)
        ) {
            return undefined;
        }

        const privateKeyPem =
            fs.readFileSync(
                outputPath,
                "utf8"
            ).trim();

        if (
            !privateKeyPem.startsWith(
                "-----BEGIN "
            )
        ) {
            return undefined;
        }

        return `${privateKeyPem}\n`;
    } catch {
        return undefined;
    } finally {
        try {
            fs.rmSync(
                temporaryDirectory,
                {
                    recursive: true,
                    force: true
                }
            );
        } catch {
            // Ignore temporary file cleanup errors.
        }
    }
}
