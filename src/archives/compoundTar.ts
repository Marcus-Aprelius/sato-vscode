import * as path from "path";

import type { ArchiveFormat } from "./types";

export function isCompoundTarFormat(
    format: ArchiveFormat
): boolean {
    return (
        format === "tar-gzip" || format === "tar-bzip2" || format === "tar-xz" ||
        format === "tar-zstd" ||format === "tar-compress"
    );
}

export function compoundTarFileName(
    archivePath: string
): string {
    const lowerPath = archivePath.toLowerCase();
    const fileName = path.basename(archivePath);

    if (lowerPath.endsWith(".tar.gz")) {
        return fileName.slice(0, -3);
    }

    if (lowerPath.endsWith(".tgz")) {
        return fileName.slice(0, -4) + ".tar";
    }

    if (lowerPath.endsWith(".tar.bz2")) {
        return fileName.slice(0, -4);
    }

    if (lowerPath.endsWith(".tbz2")) {
        return fileName.slice(0, -5) + ".tar";
    }

    if (lowerPath.endsWith(".tar.xz")) {
        return fileName.slice(0, -3);
    }

    if (lowerPath.endsWith(".txz")) {
        return fileName.slice(0, -4) + ".tar";
    }

    if (lowerPath.endsWith(".tar.zst")) {
        return fileName.slice(0, -4);
    }

    if (lowerPath.endsWith(".tzst")) {
        return fileName.slice(0, -5) + ".tar";
    }

    if (lowerPath.endsWith(".tar.z")) {
        return fileName.slice(0, -2);
    }

    if (lowerPath.endsWith(".taz")) {
        return fileName.slice(0, -4) + ".tar";
    }

    return fileName + ".tar";
}
