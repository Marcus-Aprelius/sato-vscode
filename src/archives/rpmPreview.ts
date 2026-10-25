import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { extractRpmCpioPayload } from "./rpmPayload";
import { previewSevenZipEntry } from "./sevenZipPreview";

import type { ArchivePreviewResult } from "./zipPreview";

export async function previewRpmEntry(
    packagePath: string,
    entryPath: string
): Promise<ArchivePreviewResult> {
    const internalPath = stripPayloadPrefix(entryPath);

    if (!internalPath) {
        return { kind: "unsupported", message: "Preview is not available for the files."};
    }

    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-rpm-preview-"));

    try {
        const cpioPath = await extractRpmCpioPayload(packagePath, temporaryDirectory);
        return await previewSevenZipEntry(cpioPath, internalPath);

    } catch (error) {
        return {kind: "error", message: error instanceof Error ? error.message : String(error)};

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

function stripPayloadPrefix(
    entryPath: string
): string {
    const normalizedPath = entryPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");

    if (!normalizedPath.startsWith("Payload/")) {
        return "";
    }

    return normalizedPath.slice("Payload/".length);
}
