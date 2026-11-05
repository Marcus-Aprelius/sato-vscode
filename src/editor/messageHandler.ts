import * as path from "path";
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

    if (msg.type === "openYamlJsonFile") {
        await openYamlJsonFile(panel);
        return;
    }

    if (msg.type === "openQrTextFile") {
        await openQrTextFile(panel);
        return;
    }

    if (msg.type === "saveYamlJsonFile") {
        await saveYamlJsonFile(msg.content, msg.format, msg.sourceFilePath);
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

async function openQrTextFile(
    panel: vscode.WebviewPanel
): Promise<void> {
    const selected = await vscode.window.showOpenDialog({
        title: "SATO - Open Text File for QR Code",
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            "Text files": ["txt", "json", "yaml", "yml", "csv", "xml", "md", "log"],
            "All files": ["*"]
        }
    });

    const sourceUri = selected?.[0];

    if (!sourceUri) {
        return;
    }

    try {
        const bytes = await vscode.workspace.fs.readFile(sourceUri);
        const content = Buffer.from(bytes).toString("utf8");
        await panel.webview.postMessage({type: "qrTextFileOpened", content, filePath: sourceUri.fsPath});

    } catch (error) {
        vscode.window.showErrorMessage("SATO: failed to open the file for QR generation - " + describeMessageError(error));
    }
}

async function openYamlJsonFile(
    panel: vscode.WebviewPanel
): Promise<void> {
    const selected = await vscode.window.showOpenDialog({
        title: "SATO - Open YAML or JSON File",
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {"YAML and JSON files": ["yaml", "yml", "json"]}
    });

    const sourceUri = selected?.[0];

    if (!sourceUri) {
        return;
    }

    try {
        const bytes = await vscode.workspace.fs.readFile(sourceUri);
        const content = Buffer.from(bytes).toString("utf8");
        const lowerPath = sourceUri.fsPath.toLowerCase();
        const format: "yaml" | "json" = lowerPath.endsWith(".json") ? "json" : "yaml";

        await panel.webview.postMessage({type: "yamlJsonFileOpened", content, format, filePath: sourceUri.fsPath});

    } catch (error) {
        vscode.window.showErrorMessage("SATO: failed to open the YAML or JSON file - " + describeMessageError(error));
    }
}

function yamlJsonOutputUri(
    sourceFilePath: string,
    outputFormat: "yaml" | "json"
): vscode.Uri {
    if (!sourceFilePath.trim()) {
        return vscode.Uri.file(
            path.resolve(`converted.${outputFormat}`)
        );
    }

    const parsed = path.parse(sourceFilePath);
    const sourceLabel = parsed.ext.toLowerCase() === ".yml" ? "yaml" : parsed.ext.replace(/^\./, "").toLowerCase() || "source";

    return vscode.Uri.file(path.join(parsed.dir, `${parsed.name}_${sourceLabel}.${outputFormat}`));
}

async function saveYamlJsonFile(
    content: string,
    format: "yaml" | "json",
    sourceFilePath: string
): Promise<void> {
    if (!content) {
        vscode.window.showWarningMessage("SATO: there is no converted YAML or JSON content to save.");
        return;
    }

    const defaultUri = yamlJsonOutputUri(sourceFilePath, format);

    const target = await vscode.window.showSaveDialog({
        title: format === "json" ? "SATO - Save JSON File" : "SATO - Save YAML File",
        defaultUri,
        filters: format === "json" ? {"JSON files": ["json"]} : {"YAML files": ["yaml", "yml"]},
        saveLabel: "Download"
    });

    if (!target) {
        return;
    }

    try {
        await vscode.workspace.fs.writeFile(target, Buffer.from(content, "utf8"));
        vscode.window.showInformationMessage(`SATO: ${format.toUpperCase()} file saved successfully.`);

    } catch (error) {
        vscode.window.showErrorMessage(`SATO: failed to save the ${format.toUpperCase()} file - ` + describeMessageError(error));
    }
}

function describeMessageError(
    error: unknown
): string {
    return error instanceof Error ? error.message : String(error);
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
