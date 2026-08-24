import * as vscode from "vscode";
import { readImportedVaultField } from "../importedVault";

import type { VaultAdapterRuntime } from "./index";
import type { ImportedVault } from "../importedVault";
import type { FromWebview, VaultDocument } from "../types";

export async function handleImportedVaultMessage(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    msg: FromWebview,
    runtime: VaultAdapterRuntime
): Promise<void> {
    const vault = document.importedVault;

    if (!vault) {
        return;
    }

    const settings = runtime.readSettings();

    switch (msg.type) {
        case "copySecret": {
            const value = readImportedVaultField(
                vault,
                msg.entryId,
                msg.field
            );

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
            const value = readImportedVaultField(
                vault,
                msg.entryId,
                msg.field
            );

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
            const entry = vault.entries.get(
                msg.entryId
            );

            if (!entry) {
                return;
            }

            panel.webview.postMessage({
                type: "entryDetail",
                detail: {
                    id: entry.id,
                    groupId: entry.groupId,
                    title: entry.title,
                    username: entry.username,
                    password: entry.password,
                    url: entry.url,
                    notes: entry.notes
                }
            });

            return;
        }

        case "getDbInfo": {
            const fileSize = await readFileSize(
                document
            );

            panel.webview.postMessage({
                type: "dbInfo",
                info: buildImportedVaultInfo(
                    document,
                    vault,
                    fileSize
                )
            });

            return;
        }

        case "createEntry":
        case "updateEntry":
        case "deleteEntry":
        case "duplicateEntry":
        case "createGroup":
        case "renameGroup":
        case "deleteGroup": {
            vscode.window.showInformationMessage(
                `SATO: ${formatName(vault.format)} is currently read-only.`
            );

            return;
        }
    }
}

function buildImportedVaultInfo(
    document: VaultDocument,
    vault: ImportedVault,
    fileSize: number
): Record<string, unknown> {
    return {
        title: "Vault Info",
        rows: [
            [
                "Name",
                vault.name
            ],
            [
                "Format",
                formatName(vault.format)
            ],
            [
                "Mode",
                "Read-only"
            ],
            [
                "File path",
                document.uri.fsPath
            ],
            [
                "File size",
                `${fileSize} bytes`
            ],
            [
                "Groups",
                String(vault.stats.groups)
            ],
            [
                "Entries",
                String(vault.stats.entries)
            ],
            [
                "Weak passwords",
                String(vault.stats.weak)
            ],
            [
                "Duplicate passwords",
                String(vault.stats.duplicates)
            ]
        ]
    };
}

async function readFileSize(
    document: VaultDocument
): Promise<number> {
    try {
        const stat = await vscode.workspace.fs.stat(
            document.uri
        );

        return stat.size;
    } catch {
        return 0;
    }
}

function formatName(
    format: ImportedVault["format"]
): string {
    switch (format) {
        case "kdb":
            return "KeePass 1.x";

        case "1pif":
            return "1Password Interchange Format";

        case "opvault":
            return "1Password OPVault";

        case "agilekeychain":
            return "1Password Agile Keychain";

        case "bcup":
            return "Buttercup Vault";

        default:
            return format;
    }
}
