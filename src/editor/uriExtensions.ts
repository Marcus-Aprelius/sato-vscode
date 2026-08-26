import type * as vscode from "vscode";

export function hasExtension(
    uri: vscode.Uri,
    extension: string
): boolean {
    return uri.fsPath
        .toLowerCase()
        .endsWith(extension);
}
