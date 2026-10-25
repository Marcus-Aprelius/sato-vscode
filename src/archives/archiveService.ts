import { detectArchiveFormat } from "./format";
import { inspectZipArchive } from "./zipReader";
import { UneggUnavailableError } from "./uneggCli";
import { inspectUneggArchive } from "./uneggInspector";
import { checkUnegg } from "../editor/dependencyChecks";
import { SevenZipUnavailableError } from "./sevenZipCli";
import { checkSevenZip } from "../editor/dependencyChecks";
import { inspectSevenZipArchive } from "./sevenZipInspector";
import { inspectDebPackage } from "./debInspector";
import { inspectRpmPackage } from "./rpmInspector";

import type {ArchiveInspection, ArchiveSecurityLimits } from "./types";

export async function inspectArchive(
    filePath: string,
    limits?: ArchiveSecurityLimits,
    password?: string
): Promise<ArchiveInspection> {
    const format = detectArchiveFormat(filePath);

    if (!format) {
        throw new Error(`Unsupported archive format: ${filePath}`);
    }

    switch (format) {
        case "zip":
            return inspectZipArchive(filePath, limits);

        case "alz":
        case "egg":
            if (!checkUnegg()) {
                throw new UneggUnavailableError();
            }

            return inspectUneggArchive(filePath, format, limits, password);

        case "deb":
            if (!checkSevenZip()) {
                throw new SevenZipUnavailableError();
            }

            return inspectDebPackage(filePath, limits);

        case "rpm":
            if (!checkSevenZip()) {
                throw new SevenZipUnavailableError();
            }

            return inspectRpmPackage(filePath, limits);

        case "zipx":
        case "7z":
        case "rar":
        case "dmg":
        case "cab":
        case "cpio":
        case "ar":
        case "zstd":
        case "tar-zstd":
        case "lzma":
        case "compress":
        case "tar-compress":
        case "lzh":
        case "arj":
        case "xar":
        case "chm":
        case "tar":
        case "tar-gzip":
        case "tar-bzip2":
        case "tar-xz":
        case "gzip":
        case "bzip2":
        case "xz":
            if (!checkSevenZip()) {
                throw new SevenZipUnavailableError();
            }

            return inspectSevenZipArchive(filePath, format, limits, password);
    }
}
