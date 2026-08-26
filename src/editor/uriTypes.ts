import type * as vscode from "vscode";

import { hasExtension } from "./uriExtensions";

export function isOnePifUri(
    uri: vscode.Uri
): boolean {
    return hasExtension(
        uri,
        ".1pif"
    );
}

export function isButtercupUri(
    uri: vscode.Uri
): boolean {
    return hasExtension(
        uri,
        ".bcup"
    );
}

export function isOpenPgpEncryptedFile(
    uri: vscode.Uri | undefined
): boolean {
    if (!uri) {
        return false;
    }

    return (
        hasExtension(uri, ".gpg") ||
        hasExtension(uri, ".pgp") ||
        hasExtension(uri, ".asc")
    );
}
