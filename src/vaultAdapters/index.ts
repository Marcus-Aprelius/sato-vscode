import type * as vscode from "vscode";
import type { Settings } from "../webview";
import type { VaultDocument } from "../types";

import { normalizeBackupFileName } from "../fileFormats";

export type CopyToClipboard = (
    value: string,
    message: string,
    settings: Settings
) => Promise<void>;

export type PersistVault = (
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    successMessage: string
) => Promise<void>;

export interface VaultAdapterRuntime {
    readSettings: () => Settings;
    copyToClipboard: CopyToClipboard;
    persist: PersistVault;
}

export function isPsafeUri(
    uri: vscode.Uri
): boolean {
    const fileName = originalFileName(uri);
    return (fileName.endsWith(".psafe3") || fileName.endsWith(".ibak"));
}

export function isKdbxUri(
    uri: vscode.Uri
): boolean {
    return originalFileName(uri).endsWith(".kdbx");
}

function originalFileName(
    uri: vscode.Uri
): string {
    const fileName = uri.fsPath.replace(/\\/g, "/").split("/").at(-1) || "";
    return normalizeBackupFileName(fileName);
}
