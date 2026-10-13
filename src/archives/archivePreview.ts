import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { compoundTarFileName, isCompoundTarFormat} from "./compoundTar";
import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";
import { previewSevenZipEntry } from "./sevenZipPreview";
import { previewZipEntry } from "./zipPreview";
import { previewUneggEntry } from "./uneggPreview";
import { previewDebEntry } from "./debPreview";
import { previewRpmEntry } from "./rpmPreview";

import type { ArchiveInspection } from "./types";
import type { ArchivePreviewResult } from "./zipPreview";

export async function previewArchiveEntry(
    archivePath: string,
    inspection: ArchiveInspection,
    entryPath: string,
    password?: string
): Promise<ArchivePreviewResult> {
    if (inspection.format === "zip") {
        return previewZipEntry(archivePath, entryPath, password);
    }

    if (inspection.format === "alz" || inspection.format === "egg") {
        return previewUneggEntry(archivePath, entryPath, password);
    }

    if (inspection.format === "deb") {
        return previewDebEntry(archivePath, entryPath);
    }

    if (inspection.format === "rpm") {
        return previewRpmEntry(archivePath, entryPath);
    }

    if (isCompoundTarFormat(inspection.format)) {
        return previewCompoundTarEntry(archivePath, entryPath, password);
    }

    return previewSevenZipEntry(archivePath, entryPath, password);
}

async function previewCompoundTarEntry(
    archivePath: string,
    entryPath: string,
    password?: string
): Promise<ArchivePreviewResult> {
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-tar-preview-"));

    try {
        const args = ["x", archivePath, `-o${temporaryDirectory}`, "-y", "-bd", "-bso1", "-bse1", password !== undefined ? `-p${password}` : "-p-"];
        const result = await runSevenZip(args);

        if (result.exitCode !== 0) {
            return {kind: "error", message: normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`)};
        }

        const expectedPath = path.join(temporaryDirectory, compoundTarFileName(archivePath));
        const innerTarPath = await findExtractedTar(temporaryDirectory, expectedPath);

        return await previewSevenZipEntry(innerTarPath, entryPath);

    } catch (error) {
        return {kind: "error", message: error instanceof Error ? error.message : String(error)};

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function findExtractedTar(
    directory: string,
    expectedPath: string
): Promise<string> {
    try {
        const stat = await fs.promises.stat(expectedPath);

        if (stat.isFile()) {
            return expectedPath;
        }

    } catch {
        // Search for the extracted TAR below.
    }

    const entries = await fs.promises.readdir(directory, {withFileTypes: true});
    const tarEntry = entries.find(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".tar"));

    if (!tarEntry) {
        throw new Error("The compressed archive did not contain an inner TAR file.");
    }

    return path.join(directory, tarEntry.name);
}
