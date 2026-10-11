import { hasExtension } from "./uriExtensions";
import { ARCHIVE_FILE_EXTENSIONS } from "../fileFormats";

import type * as vscode from "vscode";

export function isArchiveUri(
    uri: vscode.Uri
): boolean {
    return (hasExtension(uri, ".zip.bak") || ARCHIVE_FILE_EXTENSIONS.some(extension => hasExtension(uri, `.${extension}`)));
}

export function isOnePifUri(
    uri: vscode.Uri
): boolean {
    return hasExtension(uri, ".1pif");
}

export function isButtercupUri(
    uri: vscode.Uri
): boolean {
    return hasExtension(uri, ".bcup");
}

export function isOpenPgpEncryptedFile(
    uri: vscode.Uri | undefined
): boolean {
    if (!uri) {
        return false;
    }

    return (hasExtension(uri, ".gpg") || hasExtension(uri, ".pgp") || hasExtension(uri, ".asc"));
}
