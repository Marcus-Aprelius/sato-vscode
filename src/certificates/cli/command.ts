import * as fs from "fs";
import * as path from "path";

import { spawnSync } from "child_process";
import {createTemporaryDirectory, removeTemporaryDirectory} from "./tempDirectory";

import type { CommandResult } from "./types";

export function isCommandAvailable(
    command: string
): boolean {
    const result = spawnSync(process.platform === "win32" ? "where" : "which", [command], {encoding: "utf8", timeout: 3000 });

    return (
        !result.error &&
        result.status === 0
    );
}

export function runWithTempFile(
    bytes: Uint8Array,
    fileName: string,
    command: string,
    argsFactory: (tmpFile: string) => string[]
): CommandResult {
    let tmp = "";

    try {
        tmp = createTemporaryDirectory("sato-crypto-");

        const tmpFile = path.join(tmp, fileName);
        fs.writeFileSync(tmpFile, Buffer.from(bytes));
        const result = spawnSync(command, argsFactory(tmpFile), {encoding: "utf8", timeout: 5000});
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
        removeTemporaryDirectory(
            tmp
        );
    }
}
