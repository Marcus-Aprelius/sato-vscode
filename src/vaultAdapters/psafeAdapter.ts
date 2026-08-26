import * as vscode from "vscode";

import type { VaultAdapterRuntime } from "./index";
import type { FromWebview, VaultDocument } from "../types";

import {
    createPsafeEntry,
    createPsafeGroup,
    deletePsafeEntry,
    deletePsafeGroup,
    duplicatePsafeEntry,
    openPsafeVault,
    readPsafeEntryDetail,
    readPsafeField,
    renamePsafeGroup,
    savePsafeVaultToBytes,
    updatePsafeEntry
} from "../psafe";

export async function unlockPsafeVault(
    document: VaultDocument,
    bytes: Uint8Array,
    password: string
): Promise<void> {
    const psafe = await openPsafeVault(bytes, password);

    document.psafe = psafe;
    document.db = undefined;
    document.credentials = undefined;
}

async function saveAndRefreshPsafe(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    runtime: VaultAdapterRuntime,
    message: string
): Promise<void> {
    const psafe = document.psafe;

    if (!psafe) {
        return;
    }

    try {
        const bytes = savePsafeVaultToBytes(psafe);

        await vscode.workspace.fs.writeFile(document.uri, bytes);

        panel.webview.postMessage({type: "vaultState", state: {tree: psafe.tree, stats: psafe.stats, settings:runtime.readSettings()}});

        vscode.window.setStatusBarMessage(message, 2500);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        console.error("SATO: failed to save Password Safe vault:", err);

        vscode.window.showErrorMessage(`SATO: failed to save Password Safe vault - ${errorMessage}`);
    }
}

function psafeGroupNameFromId(groupId: string): string {
    if (groupId === "root") {
        return "Password Safe";
    }

    if (!groupId.startsWith("group-")) {
        return groupId;
    }

    const path = groupId.slice("group-".length);
    const parts = path.split(".").filter(Boolean);

    return parts.length > 0 ? parts[parts.length - 1] : path;
}

function psafeGroupPathFromId(groupId: string): string {
    if (groupId === "root") {
        return "Password Safe";
    }

    if (groupId.startsWith("group-")) {
        return groupId.slice("group-".length);
    }

    return groupId;
}

export async function handlePsafeMessage(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    msg: FromWebview,
    runtime: VaultAdapterRuntime
): Promise<void> {
    const psafe = document.psafe;

    if (!psafe) {
        return;
    }

    const settings = runtime.readSettings();

    switch (msg.type) {
        case "copySecret": {
            const value = readPsafeField(psafe, msg.entryId, msg.field);

            if (value === undefined) {
                return;
            }

            await runtime.copyToClipboard(
                value,
                `SATO: copied ${msg.field}`,
                settings
            );

            return;
        }

        case "copyText": {
            if (!msg.text) {
                return;
            }

            await runtime.copyToClipboard(
                msg.text,
                "SATO: copied text",
                settings
            );

            return;
        }

        case "revealSecret": {
            const value = readPsafeField(psafe, msg.entryId, msg.field);

            if (value === undefined) {
                return;
            }

            panel.webview.postMessage({
                type: "secretRevealed",
                entryId: msg.entryId,
                field: msg.field,
                value
            });

            return;
        }

        case "getEntryDetail": {
            const detail = readPsafeEntryDetail(psafe, msg.entryId);

            if (detail) {
                panel.webview.postMessage({
                    type: "entryDetail",
                    detail
                });
            }

            return;
        }

        case "getDbInfo": {
            let fileSize = 0;

            try {
                const stat = await vscode.workspace.fs.stat(document.uri);
                fileSize = stat.size;
            } catch {
                // ignore
            }

            panel.webview.postMessage({
                type: "dbInfo",
                info: {
                    name: "Password Safe",
                    desc: "Password Safe .psafe3 vault",
                    generator: "Password Safe",
                    version: "psafe3",
                    filePath: document.uri.fsPath,
                    fileSize,
                    groupCount: psafe.stats.groups,
                    entryCount: psafe.stats.entries,
                    recycleBinEnabled: false
                }
            });

            return;
        }

        case "createEntry": {
            createPsafeEntry(psafe, msg.groupId, msg.fields);

            await saveAndRefreshPsafe(
                document,
                panel,
                runtime,
                `SATO: Created “${msg.fields.title}”`
            );

            return;
        }

        case "updateEntry": {
            updatePsafeEntry(psafe, msg.entryId, msg.fields);

            await saveAndRefreshPsafe(
                document,
                panel,
                runtime,
                `SATO: Updated “${msg.fields.title}”`
            );

            return;
        }

        case "deleteEntry": {
            const title = readPsafeField(psafe, msg.entryId, "Title") || "(untitled)";

            if (settings.confirmBeforeDelete) {
                const answer = await vscode.window.showWarningMessage(
                    `Delete entry “${title}”?`,
                    { modal: true },
                    "Delete"
                );

                if (answer !== "Delete") {
                    return;
                }
            }

            deletePsafeEntry(psafe, msg.entryId);

            await saveAndRefreshPsafe(
                document,
                panel,
                runtime,
                `SATO: Deleted “${title}”`
            );

            return;
        }

        case "duplicateEntry": {
            duplicatePsafeEntry(psafe, msg.entryId);

            await saveAndRefreshPsafe(
                document,
                panel,
                runtime,
                "SATO: Entry duplicated"
            );

            return;
        }

        case "createGroup": {
            const name = await vscode.window.showInputBox({
                title: "SATO - new folder",
                prompt: "Folder name",
                validateInput: (v) => (v.trim() ? undefined : "Name required")
            });

            if (!name) {
                return;
            }

            createPsafeGroup(psafe, msg.parentId, name);

            panel.webview.postMessage({
                type: "vaultState",
                state: {
                    tree: psafe.tree,
                    stats: psafe.stats,
                    settings
                }
            });

            vscode.window.setStatusBarMessage(
                `SATO: Created folder “${name.trim()}”`,
                2500
            );

            vscode.window.showInformationMessage(
                "SATO: empty .psafe3 folder is shown in this session. Add an entry inside it to persist it in the vault."
            );

            return;
        }

        case "renameGroup": {
            if (msg.groupId === "root") {
                vscode.window.showWarningMessage("SATO: cannot rename the root group");
                return;
            }

            const currentName = psafeGroupNameFromId(msg.groupId);

            const name = await vscode.window.showInputBox({
                title: "SATO - rename folder",
                prompt: "New folder name",
                value: currentName,
                validateInput: (v) => (v.trim() ? undefined : "Name required")
            });

            if (!name || name.trim() === currentName) {
                return;
            }

            renamePsafeGroup(psafe, msg.groupId, name);

            await saveAndRefreshPsafe(
                document,
                panel,
                runtime,
                `SATO: Renamed folder to “${name.trim()}”`
            );

            return;
        }

        case "deleteGroup": {
            if (msg.groupId === "root") {
                vscode.window.showWarningMessage("SATO: cannot delete the root group");
                return;
            }

            const groupPath = psafeGroupPathFromId(msg.groupId);

            if (settings.confirmBeforeDelete) {
                const answer = await vscode.window.showWarningMessage(
                    `Delete folder “${groupPath}” and all entries inside?`,
                    { modal: true },
                    "Delete"
                );

                if (answer !== "Delete") {
                    return;
                }
            }

            deletePsafeGroup(psafe, msg.groupId);

            await saveAndRefreshPsafe(
                document,
                panel,
                runtime,
                `SATO: Deleted folder “${groupPath}”`
            );

            return;
        }
    }
}
