import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

import type { CommandResult } from "./types";

import {
    createTemporaryDirectory,
    removeTemporaryDirectory
} from "./tempDirectory";

export function decryptGpgWithPrivateKey(
    encryptedBytes: Uint8Array,
    privateKeyBytes: Uint8Array,
    password: string
): CommandResult {
    let tmp = "";

    try {
        tmp = createTemporaryDirectory("sato-gpg-");

        const gpgHome = path.join(tmp, "gnupg");
        const encryptedFile = path.join(tmp, "encrypted.gpg");
        const privateKeyFile = path.join(tmp, "private-key.asc");

        fs.mkdirSync(gpgHome, {recursive: true, mode: 0o700});
        fs.writeFileSync(encryptedFile, Buffer.from(encryptedBytes), {mode: 0o600});
        fs.writeFileSync(privateKeyFile, Buffer.from(privateKeyBytes), {mode: 0o600});

        const importResult = spawnSync(
            "gpg",
            ["--homedir", gpgHome, "--batch", "--no-tty", "--import", privateKeyFile],
            {encoding: "utf8", timeout: 10000}
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
            ["--homedir", gpgHome, "--batch", "--yes", "--no-tty", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "--decrypt", encryptedFile],
            {encoding: "utf8", timeout: 15000, input: `${password}\n`}
        );

        const stdout = decryptResult.stdout || "";
        const stderr = decryptResult.stderr || "";
        const text = `${stdout}\n${stderr}`.trim();

        return {
            ok: !decryptResult.error && decryptResult.status === 0,
            text,
            stdout,
            stderr
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

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
                ["--homedir", gpgHome, "--kill", "gpg-agent"],
                {encoding: "utf8", timeout: 3000}
            );
        }
        removeTemporaryDirectory(tmp);
    }
}
