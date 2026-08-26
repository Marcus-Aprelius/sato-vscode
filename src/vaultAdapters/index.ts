import type * as vscode from "vscode";
import type { Settings } from "../webview";
import type { VaultDocument } from "../types";

import { hasExtension } from "../editor/uriExtensions";

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
    return (
        hasExtension(uri, ".psafe3") ||
        hasExtension(uri, ".ibak")
    );
}

export function isKdbxUri(uri: vscode.Uri): boolean {
    return hasExtension(
        uri,
        ".kdbx"
    );
}
