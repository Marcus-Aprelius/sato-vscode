import * as vscode from "vscode";
import { SUPPORTED_VAULT_FILTERS } from "../constants";
import { handleCryptoMessage } from "./cryptoMessages";
import { handleArchiveMessage } from "./archiveMessages";
import { readCryptoFilesFromDirectory } from "./cryptoFiles";
import { handleKdbxMessage } from "../vaultAdapters/kdbxAdapter";
import { handlePsafeMessage } from "../vaultAdapters/psafeAdapter";
import { handleImportedVaultMessage } from "../vaultAdapters/importedVaultAdapter";

import type { Settings } from "../webview";
import type { FromWebview, VaultDocument } from "../types";
import type { VaultAdapterRuntime } from "../vaultAdapters";

export interface EditorMessageRuntime {
    viewType: string;

    reload: () => Promise<void>;
    lock: () => void;
    openSupportedFile: (filePath: string) => Promise<void>;
    scheduleAutoLock: () => void;
    readSettings: () => Settings;
    updateSettings: (settings: Settings) => Promise<void>;
    checkForUpdates: () => Promise<void>;
    openExternalUrl: (url: string) => Promise<void>;
    unlockWithPassword: (password: string) => Promise<void>;

    adapterRuntime: VaultAdapterRuntime;
}

export async function handleEditorMessage(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    msg: FromWebview,
    runtime: EditorMessageRuntime
): Promise<void> {
    if (msg.type === "unlock" || msg.type === "reload") {
        await runtime.reload();
        return;
    }

    if (msg.type === "lock") {
        runtime.lock();
        return;
    }

    if (msg.type === "openDb") {
        await openVault(runtime.viewType);
        return;
    }

    if (msg.type === "openWithDefaultEditor") {
        await vscode.commands.executeCommand("vscode.openWith", document.uri,"default");
        return;
    }

    if (msg.type === "openDirectory") {
        await openCryptoDirectory(runtime.viewType);
        return;
    }

    if (msg.type === "openSupportedFile") {
        await runtime.openSupportedFile(msg.filePath);
        return;
    }

    if (msg.type === "unlockWithPassword") {
        await runtime.unlockWithPassword(msg.password);
        return;
    }

    if (msg.type === "updateSettings") {
        await runtime.updateSettings(msg.settings);

        vscode.window.setStatusBarMessage("SATO: settings saved", 2000);
        return;
    }


    if (msg.type === "checkUpdate") {
        await runtime.checkForUpdates();
        return;
    }

    if (msg.type === "openUrl") {
        await runtime.openExternalUrl(msg.url);
        return;
    }

    if (msg.type === "saveQrCode") {
        await saveQrCode(msg.pngBase64);
        return;
    }

    const archiveHandled = await handleArchiveMessage(document, panel, msg, runtime.reload, runtime.readSettings);

    if (archiveHandled) {
        return;
    }

    const cryptoHandled = await handleCryptoMessage(document, panel, msg, {
        reload: runtime.reload,
        readSettings: runtime.readSettings,
        copyToClipboard: runtime.adapterRuntime.copyToClipboard
    });

    if (cryptoHandled) {
        return;
    }

    if (document.importedVault) {
        await handleImportedVaultMessage(document, panel, msg, runtime.adapterRuntime);
        return;
    }

    if (document.psafe) {
        await handlePsafeMessage(document, panel, msg, runtime.adapterRuntime);
        return;
    }

    if (document.db) {
        await handleKdbxMessage(document, panel, msg, runtime.adapterRuntime);
    }
}

async function openVault(
    viewType: string
): Promise<void> {
    const selected = await vscode.window.showOpenDialog({
        title: "SATO - Open Password Vault",
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: SUPPORTED_VAULT_FILTERS
    });

    const uri = selected?.[0];

    if (!uri) {
        return;
    }

    await vscode.commands.executeCommand("vscode.openWith", uri, viewType);
}

async function openCryptoDirectory(
    viewType: string
): Promise<void> {
    const selected = await vscode.window.showOpenDialog({title: "SATO - Open Crypto Directory", canSelectFiles: false, canSelectFolders: true, canSelectMany: false});
    const directoryUri = selected?.[0];

    if (!directoryUri) {
        return;
    }

    const files = await readCryptoFilesFromDirectory(directoryUri);

    if (!files.length) {
        vscode.window.showInformationMessage("SATO: no supported crypto files found in selected directory");
        return;
    }

    await vscode.commands.executeCommand("vscode.openWith", files[0].uri, viewType);
}

async function saveQrCode(
    pngBase64: string
): Promise<void> {
    const target = await vscode.window.showSaveDialog({
        title: "SATO - Save QR Code",
        defaultUri: vscode.Uri.file("qrcode.png"),
        filters: {"PNG Image": ["png"]},
        saveLabel: "Save"
    });

    if (!target) {
        return;
    }

    try {
        const normalizedBase64 = pngBase64.replace(/^data:image\/png;base64,/, "");
        const bytes = Buffer.from(normalizedBase64, "base64");
        await vscode.workspace.fs.writeFile(target, bytes);
        vscode.window.showInformationMessage("SATO: QR code saved.");

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`SATO: failed to save QR code - ${message}`);
    }
}
