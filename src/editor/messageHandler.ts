import * as vscode from "vscode";
import { SUPPORTED_VAULT_FILTERS } from "../constants";
import { handleCryptoMessage } from "./cryptoMessages";
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
    scheduleAutoLock: () => void;

    readSettings: () => Settings;

    updateSettings: (
        settings: Settings
    ) => Promise<void>;

    checkForUpdates: () => Promise<void>;

    openExternalUrl: (
        url: string
    ) => Promise<void>;

    unlockWithPassword: (
        password: string
    ) => Promise<void>;

    adapterRuntime: VaultAdapterRuntime;
}

export async function handleEditorMessage(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    msg: FromWebview,
    runtime: EditorMessageRuntime
): Promise<void> {
    if (
        msg.type === "unlock" ||
        msg.type === "reload"
    ) {
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

    if (msg.type === "openDirectory") {
        await openCryptoDirectory(
            runtime.viewType
        );

        return;
    }

    if (msg.type === "unlockWithPassword") {
        await runtime.unlockWithPassword(
            msg.password
        );

        return;
    }

    if (msg.type === "updateSettings") {
        await runtime.updateSettings(
            msg.settings
        );

        vscode.window.setStatusBarMessage(
            "SATO: settings saved",
            2000
        );

        return;
    }

    if (msg.type === "checkUpdate") {
        await runtime.checkForUpdates();
        return;
    }

    if (msg.type === "openUrl") {
        await runtime.openExternalUrl(
            msg.url
        );

        return;
    }

    const cryptoHandled =
        await handleCryptoMessage(
            document,
            panel,
            msg,
            {
                readSettings:
                    runtime.readSettings,

                copyToClipboard:
                    runtime.adapterRuntime
                        .copyToClipboard
            }
        );

    if (cryptoHandled) {
        return;
    }

    if (document.importedVault) {
        await handleImportedVaultMessage(
            document,
            panel,
            msg,
            runtime.adapterRuntime
        );

        return;
    }

    if (document.psafe) {
        await handlePsafeMessage(
            document,
            panel,
            msg,
            runtime.adapterRuntime
        );

        return;
    }

    if (document.db) {
        await handleKdbxMessage(
            document,
            panel,
            msg,
            runtime.adapterRuntime
        );
    }
}

async function openVault(
    viewType: string
): Promise<void> {
    const selected =
        await vscode.window.showOpenDialog({
            title:
                "SATO - Open Password Vault",

            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,

            filters:
                SUPPORTED_VAULT_FILTERS
        });

    const uri = selected?.[0];

    if (!uri) {
        return;
    }

    await vscode.commands.executeCommand(
        "vscode.openWith",
        uri,
        viewType
    );
}

async function openCryptoDirectory(
    viewType: string
): Promise<void> {
    const selected =
        await vscode.window.showOpenDialog({
            title:
                "SATO - Open Crypto Directory",

            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false
        });

    const directoryUri = selected?.[0];

    if (!directoryUri) {
        return;
    }

    const files =
        await readCryptoFilesFromDirectory(
            directoryUri
        );

    if (!files.length) {
        vscode.window.showInformationMessage(
            "SATO: no supported crypto files found in selected directory"
        );

        return;
    }

    await vscode.commands.executeCommand(
        "vscode.openWith",
        files[0].uri,
        viewType
    );
}
