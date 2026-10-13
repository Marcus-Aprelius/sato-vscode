import { spawn } from "child_process";
import { resolveSevenZipCommand } from "../editor/dependencyChecks";

export interface SevenZipResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface SevenZipRunOptions {
    cwd?: string;
}

export class SevenZipUnavailableError extends Error {
    constructor() {
        super("7-Zip CLI is not installed.");
        this.name = "SevenZipUnavailableError";
    }
}

export async function runSevenZip(
    args: readonly string[],
    password?: string,
    options: SevenZipRunOptions = {}
): Promise<SevenZipResult> {
    const command = resolveSevenZipCommand();

    if (!command) {
        throw new SevenZipUnavailableError();
    }

    return new Promise((resolve, reject) => {
        const child = spawn(
            command,
            [...args],
            { cwd: options.cwd, shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
        );

        let stdout = "";
        let stderr = "";

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");

        child.stdout.on("data", chunk => {stdout += String(chunk);});
        child.stderr.on("data", chunk => {stderr += String(chunk);});
        child.once("error", error => {reject(error);});
        child.once("close", code => {resolve({exitCode: code ?? -1, stdout, stderr});});

        if (password !== undefined) {
            child.stdin.write(password);
            child.stdin.write("\n");
        }

        child.stdin.end();
    });
}

export async function runSevenZipChecked(
    args: readonly string[]
): Promise<string> {
    const result = await runSevenZip(args);

    if (result.exitCode !== 0) {
        throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
    }

    return result.stdout;
}

export async function testArchivePassword(
    archivePath: string,
    password: string
): Promise<boolean> {
    const result = await runSevenZip(["t", archivePath, `-p${password}`, "-y", "-bd", "-bso1", "-bse1"]);

    if (result.exitCode === 0) {
        return true;
    }

    const output = `${result.stdout}\n${result.stderr}`.toLowerCase();

    if (output.includes("wrong password") || output.includes("can not open encrypted archive") || output.includes("data error in encrypted file") || output.includes("data error")) {
        return false;
    }

    throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
}

export function normalizeSevenZipError(
    value: string
): string {
    return value.replace(/\r/g, "").split("\n").map(line => line.trim()).filter(Boolean).slice(-5).join(" ");
}
