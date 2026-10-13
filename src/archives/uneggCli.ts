import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { spawn } from "child_process";
import { resolveUneggCommand } from "../editor/dependencyChecks";
import { resolveSplitArchivePrimaryPath } from "./splitArchivePath";

export interface UneggResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export class UneggUnavailableError extends Error {
    constructor() {
        super("unegg CLI is not installed.");
        this.name = "UneggUnavailableError";
    }
}

export async function runUnegg(
    args: readonly string[]
): Promise<UneggResult> {
    const command = resolveUneggCommand();

    if (!command) {
        throw new UneggUnavailableError();
    }

    return new Promise((resolve, reject) => {
        const child = spawn(
            command,
            [...args],
            { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
        );

        let stdout = "";
        let stderr = "";

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", chunk => {stdout += String(chunk);});
        child.stderr.on("data", chunk => {stderr += String(chunk);});
        child.once("error", reject);
        child.once("close", code => {resolve({exitCode: code ?? -1, stdout, stderr});});
    });
}

export async function listUneggArchive(
    archivePath: string,
    password?: string
): Promise<string> {
    const args = ["-l"];

    if (password) {
        args.push("-p", password);
    }

    const resolution = await resolveSplitArchivePrimaryPath(archivePath);
    args.push(resolution.primaryPath);
    const result = await runUnegg(args);

    if (result.exitCode !== 0) {
        throw new Error(normalizeUneggError(result.stderr || result.stdout || `unegg exited with code ${result.exitCode}.`));
    }

    return result.stdout;
}

export async function extractUneggArchive(
    archivePath: string,
    destinationDirectory: string,
    password?: string
): Promise<void> {
    const resolution = await resolveSplitArchivePrimaryPath(archivePath);
    const args = ["-q", "-C", destinationDirectory];

    if (password) {
        args.push("-p", password);
    }

    args.push(resolution.primaryPath);
    const result = await runUnegg(args);

    if (result.exitCode !== 0) {
        throw new Error(normalizeUneggError(result.stderr || result.stdout ||`unegg exited with code ${result.exitCode}.`));
    }
}

export async function testUneggPassword(
    archivePath: string,
    password: string
): Promise<boolean> {
    const resolution = await resolveSplitArchivePrimaryPath(archivePath);
    const temporaryDirectory = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), "sato-unegg-test-")
    );

    try {
        const result = await runUnegg(["-q", "-C", temporaryDirectory, "-p", password, resolution.primaryPath]);
        return result.exitCode === 0;

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

export function normalizeUneggError(
    value: string
): string {
    return value.replace(/\r/g, "").split("\n").map(line => line.trim()).filter(Boolean).slice(-5).join(" ");
}
