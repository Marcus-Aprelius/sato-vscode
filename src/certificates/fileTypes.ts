import type * as vscode from "vscode";

import { CRYPTO_FILE_EXTENSIONS, SSH_PRIVATE_KEY_FILE_NAMES } from "../fileFormats";

export function isCertificateLikeUri(
    uri: vscode.Uri
): boolean {
    return isCertificateLikeFileName(
        fileNameOf(uri)
    );
}

export function isCertificateLikeFileName(
    fileName: string
): boolean {
    const normalizedName =
        fileName.toLowerCase();

    return (
        CRYPTO_FILE_EXTENSIONS.some((extension) => normalizedName.endsWith(`.${extension}`)) ||
        SSH_PRIVATE_KEY_FILE_NAMES.some((supportedName) => normalizedName === supportedName
        )
    );
}

export function isSshPrivateKeyFilePath(
    filePath: string
): boolean {
    const fileName = filePath.replace(/\\/g, "/").split("/").pop()?.toLowerCase() || "";

    return SSH_PRIVATE_KEY_FILE_NAMES.some(
        (supportedName) => fileName === supportedName
    );
}

export function fileNameOf(
    uri: vscode.Uri
): string {
    return (
        uri.path.split("/").pop() ??
        uri.fsPath.split(/[\\/]/).pop() ??
        "crypto-file"
    );
}
