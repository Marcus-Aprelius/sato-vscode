import * as fs from "fs";
import * as path from "path";

import { spawn } from "child_process";
import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";

export async function extractRpmCpioPayload(
    packagePath: string,
    destinationDirectory: string
): Promise<string> {
    await extractWithSevenZip(packagePath, destinationDirectory);
    const directCpio = await findFile(destinationDirectory, fileName => fileName.endsWith(".cpio"));

    if (directCpio) {
        return directCpio;
    }

    const compressedCpio = await findFile(
        destinationDirectory,
        fileName =>
            fileName.endsWith(".cpio.zst") ||
            fileName.endsWith(".cpio.zstd") ||
            fileName.endsWith(".cpio.xz") ||
            fileName.endsWith(".cpio.gz") ||
            fileName.endsWith(".cpio.bz2") ||
            fileName.endsWith(".cpio.lzma")
    );

    if (!compressedCpio) {
        throw new Error("The RPM payload could not be extracted. " + "Install or update the 7-Zip CLI and restart VS Code.");
    }

    const nestedDirectory = path.join(destinationDirectory, "decompressed-payload");
    await fs.promises.mkdir(nestedDirectory, {recursive: true});

    if (isZstandardPayload(compressedCpio)) {
        await decompressZstandardPayload(compressedCpio, nestedDirectory);
    } else {
        await extractWithSevenZip(compressedCpio, nestedDirectory);
    }

    const nestedCpio = await findFile(nestedDirectory, fileName => fileName.endsWith(".cpio"));

    if (!nestedCpio) {
        throw new Error("The installed 7-Zip CLI could not decompress the RPM CPIO payload. " + "Update 7-Zip and restart VS Code.");
    }

    return nestedCpio;
}

async function extractWithSevenZip(
    archivePath: string,
    destinationDirectory: string
): Promise<void> {
    const result = await runSevenZip(["x", archivePath, `-o${destinationDirectory}`, "-y", "-bd", "-bso1", "-bse1", "-p-"]);

    if (result.exitCode === 0) {
        return;
    }

    throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
}

function isZstandardPayload(
    filePath: string
): boolean {
    const lowerPath = filePath.toLowerCase();

    return lowerPath.endsWith(".cpio.zst") ||
        lowerPath.endsWith(".cpio.zstd");
}

async function decompressZstandardPayload(
    compressedPath: string,
    destinationDirectory: string
): Promise<void> {
    const fileName = path.basename(compressedPath).replace(/\.zstd$/i, "").replace(/\.zst$/i, "");
    const outputPath = path.join(destinationDirectory, fileName);
    const result = await runCommand("zstd", ["--decompress", "--force", "--quiet", "-o", outputPath, compressedPath]);

    if (result.errorCode === "ENOENT") {
        throw new Error(
            "This RPM package uses a Zstandard-compressed CPIO payload. " +
            "Install the zstd package or update 7-Zip, then restart VS Code."
        );
    }

    if (result.exitCode !== 0) {
        throw new Error(result.stderr || result.stdout || "The RPM Zstandard payload could not be decompressed.");
    }
}

function runCommand(
    command: string,
    args: readonly string[]
): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    errorCode?: string;
}> {
    return new Promise(resolve => {
        const child = spawn(
            command,
            [...args],
            {
                shell: false,
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"]
            }
        );

        let stdout = "";
        let stderr = "";
        let errorCode: string | undefined;

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");

        child.stdout.on("data", chunk => {stdout += String(chunk); });
        child.stderr.on("data", chunk => {stderr += String(chunk); });
        child.once("error", error => {errorCode = (error as NodeJS.ErrnoException).code; });
        child.once("close", code => {resolve({exitCode: code ?? -1, stdout, stderr, errorCode});});
    });
}

async function findFile(
    directoryPath: string,
    predicate: (lowerFileName: string) => boolean
): Promise<string | undefined> {
    const entries = await fs.promises.readdir(directoryPath, {withFileTypes: true});

    for (const entry of entries) {
        const entryPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
            const nested = await findFile(entryPath, predicate);

            if (nested) {
                return nested;
            }

            continue;
        }

        if (entry.isFile() && predicate(entry.name.toLowerCase())) {
            return entryPath;
        }
    }

    return undefined;
}
