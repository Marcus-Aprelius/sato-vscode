import { editSevenZipArchive } from "./sevenZipEditor";
import { editZipArchive } from "./zipEditor";
import { editCompoundTarArchive } from "./compoundTarEditor";

import type { ArchiveFormat } from "./types";
import type { ZipEditOperation, ZipEditOptions, ZipEditResult } from "./zipEditor";

export async function editArchive(
    archiveFilePath: string,
    format: ArchiveFormat,
    operation: ZipEditOperation,
    options: ZipEditOptions = {}
): Promise<ZipEditResult> {
    switch (format) {
        case "zip":
            return editZipArchive(archiveFilePath, operation, options);

        case "zipx":
        case "7z":
        case "tar":
            return editSevenZipArchive(archiveFilePath, operation, options);

        case "tar-gzip":
        case "tar-bzip2":
        case "tar-xz":
            return editCompoundTarArchive(archiveFilePath, format, operation, options);

        case "rar":
        case "alz":
        case "egg":
        case "dmg":
        case "deb":
        case "rpm":
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
            throw new Error(`Editing ${format.toUpperCase()} archives is not supported.`);

        case "gzip":
        case "bzip2":
        case "xz":
            throw new Error(`Editing archive format ${format} is not supported.`);
    }
}
