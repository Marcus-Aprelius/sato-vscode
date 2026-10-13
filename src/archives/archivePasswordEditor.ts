import { changeSevenZipPassword } from "./sevenZipPasswordEditor";
import { changeZipPassword } from "./zipPasswordEditor";

import type { ArchiveFormat } from "./types";
import type { ZipPasswordChangeOptions, ZipPasswordChangeResult } from "./zipPasswordEditor";

export async function changeArchivePassword(
    archivePath: string,
    format: ArchiveFormat,
    options: ZipPasswordChangeOptions
): Promise<ZipPasswordChangeResult> {
    switch (format) {
        case "zip":
            return changeZipPassword(archivePath, options);

        case "zipx":
        case "7z":
            return changeSevenZipPassword(archivePath, format, options);

        default:
            throw new Error(`Password management is not supported for archive format ${format}.`);
    }
}
