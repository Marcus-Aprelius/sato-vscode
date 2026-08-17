import * as childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface CommandResult {
    ok: boolean;
    text: string;
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
