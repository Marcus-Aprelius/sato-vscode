import type * as vscode from "vscode";
import type { Settings } from "../webview";
import type { VaultDocument } from "../types";

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

export function isPsafeUri(uri: vscode.Uri): boolean {
    const path = uri.fsPath.toLowerCase();

    return path.endsWith(".psafe3") || path.endsWith(".ibak");
}

export function isKdbxUri(uri: vscode.Uri): boolean {
    return uri.fsPath.toLowerCase().endsWith(".kdbx");
}
