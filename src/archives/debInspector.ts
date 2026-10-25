import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { normalizeSevenZipError, runSevenZip } from "./sevenZipCli";
import { inspectSevenZipArchive } from "./sevenZipInspector";

import type { ArchiveEntry, ArchiveInspection, ArchiveSecurityLimits } from "./types";

export async function inspectDebPackage(
    filePath: string,
    limits?: ArchiveSecurityLimits
): Promise<ArchiveInspection> {
    const packageStat = await fs.promises.stat(filePath);
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-deb-inspect-"));

    try {
        await extractDebContainer(filePath, temporaryDirectory);

        const controlArchivePath = await findDebMember(temporaryDirectory, "control.tar");
        const dataArchivePath = await findDebMember(temporaryDirectory, "data.tar");

        if (!controlArchivePath) {
            throw new Error("The DEB package does not contain a control.tar archive.");
        }

        if (!dataArchivePath) {
            throw new Error("The DEB package does not contain a data.tar archive.");
        }

        const controlInspection = await inspectNestedTarArchive(controlArchivePath, limits);
        const dataInspection = await inspectNestedTarArchive(dataArchivePath, limits);
        const entries = [...prefixEntries(controlInspection.entries, "Control"), ...prefixEntries(dataInspection.entries, "Payload")];

        return {
            fileName: path.basename(filePath),
            filePath,
            format: "deb",
            encrypted: false,
            fileSize: packageStat.size,
            entryCount: entries.length,
            totalUncompressedSize: entries.reduce((total, entry) => total + entry.uncompressedSize, 0),
            entries,
            warnings: [...controlInspection.warnings, ...dataInspection.warnings]
        };

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

async function extractDebContainer(
    filePath: string,
    destinationDirectory: string
): Promise<void> {
    const result = await runSevenZip(["x", "-tAr", filePath, `-o${destinationDirectory}`, "-y", "-bd", "-bso1", "-bse1", "-p-"]);

    if (result.exitCode === 0) {
        return;
    }

    throw new Error(normalizeSevenZipError(result.stderr || result.stdout || `7-Zip exited with code ${result.exitCode}.`));
}

async function findDebMember(
    directoryPath: string,
    baseName: string
): Promise<string | undefined> {
    const entries = await fs.promises.readdir(directoryPath, {withFileTypes: true});

    const candidate = entries.find(entry => {
        if (!entry.isFile()) {
            return false;
        }

        const lowerName = entry.name.toLowerCase();
        return (lowerName === baseName || lowerName.startsWith(`${baseName}.`));
    });

    return candidate ? path.join(directoryPath, candidate.name) : undefined;
}

async function inspectNestedTarArchive(
    archivePath: string,
    limits?: ArchiveSecurityLimits
): Promise<ArchiveInspection> {
    const format = nestedTarFormat(archivePath);
    return inspectSevenZipArchive(archivePath, format, limits);
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

function prefixEntries(
    entries: readonly ArchiveEntry[],
    prefix: string
): ArchiveEntry[] {
    return entries.map(entry => ({...entry, path: `${prefix}/${normalizeEntryPath(entry.path)}` }));
}

function normalizeEntryPath(
    entryPath: string
): string {
    return entryPath.replace(/\\/g, "/").replace(/^\.?\/*/, "").replace(/\/+$/, "");
}
