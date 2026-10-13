import { ARCHIVE_FILE_EXTENSIONS, normalizeBackupFileName } from "../fileFormats";

import type * as vscode from "vscode";

export function isArchiveUri(
    uri: vscode.Uri
): boolean {
    const fileName = normalizedOriginalFileName(uri);
    return ARCHIVE_FILE_EXTENSIONS.some(extension => fileName.endsWith(`.${extension}`));
}

export function isOnePifUri(
    uri: vscode.Uri
): boolean {
    return normalizedOriginalFileName(uri).endsWith(".1pif");
}

export function isButtercupUri(
    uri: vscode.Uri
): boolean {
    return normalizedOriginalFileName(uri).endsWith(".bcup");
}

export function isOpenPgpEncryptedFile(
    uri: vscode.Uri | undefined
): boolean {
    if (!uri) {
        return false;
    }

    const fileName = normalizedOriginalFileName(uri);

    return (fileName.endsWith(".gpg") || fileName.endsWith(".pgp") || fileName.endsWith(".asc"));
}

function normalizedOriginalFileName(
    uri: vscode.Uri
): string {
    const fileName = uri.fsPath.replace(/\\/g, "/").split("/").at(-1) || "";

    return normalizeBackupFileName(fileName);
}