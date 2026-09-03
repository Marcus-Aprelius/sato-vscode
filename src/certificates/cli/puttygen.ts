import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { createTemporaryDirectory, removeTemporaryDirectory } from "./tempDirectory";

export function tryUnlockPpkWithPuttygen(
    bytes: Uint8Array,
    password: string
): string | undefined {

    const temporaryDirectory = createTemporaryDirectory("sato-ppk-");
    const inputPath = path.join(temporaryDirectory, "private-key.ppk");
    const outputPath = path.join(temporaryDirectory, "private-key.pem");
    const oldPasswordPath = path.join(temporaryDirectory, "old-passphrase.txt");
    const newPasswordPath = path.join(temporaryDirectory, "new-passphrase.txt");

    try {
        fs.writeFileSync(inputPath, Buffer.from(bytes), {mode: 0o600});
        fs.writeFileSync(oldPasswordPath, `${password}\n`, {encoding: "utf8", mode: 0o600});
        fs.writeFileSync(newPasswordPath, "\n", {encoding: "utf8", mode: 0o600});

        const result = spawnSync(
            "puttygen",
            [inputPath, "-O", "private-openssh", "-o", outputPath, "--old-passphrase", oldPasswordPath, "--new-passphrase", newPasswordPath],
            {encoding: "utf8", maxBuffer:16 * 1024 * 1024, windowsHide: true, timeout: 30000}
        );

        if (result.error || result.status !== 0 || !fs.existsSync(outputPath)) {
            return undefined;
        }

        const privateKeyPem = fs.readFileSync(outputPath, "utf8").trim();

        if (!privateKeyPem.startsWith("-----BEGIN ")) {
            return undefined;
        }

        return `${privateKeyPem}\n`;

    } catch {
        return undefined;

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}
