import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";
import { previewArchiveEntry } from "./archivePreview";

import type { ArchiveInspection } from "./types";
import type { ArchivePreviewResult } from "./zipPreview";

export async function previewDebEntry(
    packagePath: string,
    entryPath: string
): Promise<ArchivePreviewResult> {
    const normalizedPath = normalizeEntryPath(entryPath);
    const target = resolveDebEntryTarget(normalizedPath);

    if (!target) {
        return {
            kind: "unsupported",
            message: "Preview is not available for this DEB package entry."
        };
    }

    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-deb-preview-"));

    try {
        await extractDebContainer(packagePath, temporaryDirectory);
        const memberPath = await findDebMember(temporaryDirectory, target.memberBaseName);

        if (!memberPath) {
            return {
                kind: "error",
                message: `The DEB package does not contain ${target.memberBaseName}.*.`
            };
        }

        const nestedInspection = createNestedInspection(memberPath);
        return await previewArchiveEntry(memberPath, nestedInspection, target.internalPath);

    } catch (error) {
        return {kind: "error", message: error instanceof Error ? error.message : String(error)};

    } finally {
        await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    }
}

async function extractDebContainer(
    packagePath: string,
    destinationDirectory: string
): Promise<void> {
    const result = await runSevenZip(["x", "-tAr", packagePath, `-o${destinationDirectory}`, "-y", "-bd", "-bso1", "-bse1", "-p-"]);

    if (result.exitCode === 0) {
        return;
    }

    throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
}

async function findDebMember(
    directoryPath: string,
    baseName: string
): Promise<string | undefined> {
    const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });

    const candidate = entries.find(entry => {
        if (!entry.isFile()) {
            return false;
        }

        const lowerName = entry.name.toLowerCase();

        return (lowerName === baseName || lowerName.startsWith(`${baseName}.`));
    });

    return candidate ? path.join(directoryPath, candidate.name) : undefined;
}

function resolveDebEntryTarget(
    entryPath: string
): {
    memberBaseName: "control.tar" | "data.tar";
    internalPath: string;
} | undefined {
    const controlPrefix = "Control/";
    const payloadPrefix = "Payload/";

    if (entryPath.startsWith(controlPrefix)) {
        const internalPath = entryPath.slice(controlPrefix.length);
        return internalPath ? { memberBaseName: "control.tar", internalPath } : undefined;
    }

    if (entryPath.startsWith(payloadPrefix)) {
        const internalPath = entryPath.slice(payloadPrefix.length);
        return internalPath ? {memberBaseName: "data.tar", internalPath} : undefined;
    }

    return undefined;
}

function createNestedInspection(
    archivePath: string
): ArchiveInspection {
    return {
        fileName: path.basename(archivePath),
        filePath: archivePath,
        format: nestedTarFormat(archivePath),
        encrypted: false,
        fileSize: 0,
        entryCount: 0,
        totalUncompressedSize: 0,
        entries: [],
        warnings: []
    };
}

function nestedTarFormat(
    archivePath: string
): "tar" | "tar-gzip" | "tar-bzip2" | "tar-xz" {
    const lowerPath = archivePath.toLowerCase();

    if (lowerPath.endsWith(".tar.gz") || lowerPath.endsWith(".tar.gzip")) {
        return "tar-gzip";
    }

    if (lowerPath.endsWith(".tar.bz2") || lowerPath.endsWith(".tar.bzip2")) {
        return "tar-bzip2";
    }

    if (lowerPath.endsWith(".tar.xz")) {
        return "tar-xz";
    }

    return "tar";
}

function normalizeEntryPath(
    entryPath: string
): string {
    return entryPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}
