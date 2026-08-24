import type * as vscode from "vscode";

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
        hasExtension(uri, ".pgp")
    );
}

function hasExtension(
    uri: vscode.Uri,
    extension: string
): boolean {
    return uri.fsPath
        .toLowerCase()
        .endsWith(extension);
}
