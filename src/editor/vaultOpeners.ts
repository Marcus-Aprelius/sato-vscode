import * as vscode from "vscode";
import { isButtercupUri } from "./uriTypes";
import { isPsafeUri } from "../vaultAdapters";
import { unlockKdbxVault } from "../vaultAdapters/kdbxAdapter";
import { unlockPsafeVault } from "../vaultAdapters/psafeAdapter";
import { openOnePifVault } from "../vaultAdapters/onePifAdapter";
import { openButtercupVault } from "../vaultAdapters/buttercupAdapter";

import type { VaultDocument } from "../types";

export async function openOnePifFile(
    document: VaultDocument
): Promise<boolean> {
    let bytes: Uint8Array;

    try {
        bytes = await vscode.workspace.fs.readFile(document.uri);

        } catch (err) {
        vscode.window.showErrorMessage(`SATO: failed to read 1PIF file - ${describeError(err)}`);

        return false;
    }

    try {
        const vault = await openOnePifVault(document.uri, bytes);

        clearDocumentState(document);
        document.importedVault = vault;

        vscode.window.showWarningMessage("SATO: 1PIF exports are unencrypted. Keep this file secure.");

        return true;

    } catch (err) {
        vscode.window.showErrorMessage(`SATO: failed to open 1PIF file - ${describeError(err)}`);

        return false;
    }
}

export async function unlockVaultWithPassword(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    password: string
): Promise<boolean> {
    let bytes: Uint8Array;

    try {
        bytes = await vscode.workspace.fs.readFile(document.uri);

    } catch (err) {
        panel.webview.postMessage({type: "unlockFailed", message: `Failed to read file: ${describeError(err)}`});

        return false;
    }

    if (isButtercupUri(document.uri)) {
        return unlockButtercupVault(document, panel, password);
    }

    if (isPsafeUri(document.uri)) {
        return unlockPasswordSafeVault(document, panel, bytes, password);
    }

    return unlockKeePassVault(document, panel, bytes, password);
}

export function clearDocumentState(
    document: VaultDocument
): void {
    document.db = undefined;
    document.credentials = undefined;
    document.psafe = undefined;
    document.certificate = undefined;
    document.importedVault = undefined;
}

async function unlockButtercupVault(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    password: string
): Promise<boolean> {
    try {
        const vault = await openButtercupVault(document.uri, password);

        clearDocumentState(document);
        document.importedVault = vault;

        return true;

    } catch (err) {
        const message = describeError(err);

        console.error("SATO: failed to unlock Buttercup vault:", err);

        panel.webview.postMessage({
            type: "unlockFailed",
            message: message
                ? `Failed to open Buttercup vault: ${message}`
                : "Wrong password or unsupported Buttercup vault."
        });

        return false;
    }
}

async function unlockPasswordSafeVault(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    bytes: Uint8Array,
    password: string
): Promise<boolean> {
    try {
        clearDocumentState(document);

        await unlockPsafeVault(document, bytes, password);

        return true;

    } catch {
        panel.webview.postMessage({type: "unlockFailed", message: "Wrong password or unsupported Password Safe file."});

        return false;
    }
}

async function unlockKeePassVault(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    bytes: Uint8Array,
    password: string
): Promise<boolean> {
    try {
        clearDocumentState(document);

        await unlockKdbxVault(document, bytes, password);

        return true;

    } catch (err) {
        const message = describeError(err);

        console.error("SATO: failed to unlock KDBX:", err);

        panel.webview.postMessage({
            type: "unlockFailed",
            message: message ? `Failed to open KDBX: ${message}` : "Wrong password or unsupported KDBX file."
        });

        return false;
    }
}

function describeError(
    err: unknown
): string {
    if (err instanceof Error) {
        return err.message;
    }

    return String(err);
}
