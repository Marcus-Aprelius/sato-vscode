import { byId } from "../dom";
import { vscode } from "../globals";
import { openModal } from "../modals";
import type { MenuItem } from "../types";
import { openDropdown } from "../contextMenu";

import {
    app,
    isCryptoFileView,
    isReadOnlyVault,
    vaultFormat
} from "../state";

export function openFileMenu(button: HTMLElement): void {
    const crypto = isCryptoFileView();
    const readOnly = isReadOnlyVault();
    const format = vaultFormat();

    const items: MenuItem[] = [
        {
            label: "Open",
            title: "Open vault or crypto file",

            action: () => {
                vscode.postMessage({
                    type: "openDb"
                });
            }
        },

        {
            label: "Open with Default Editor",
            title: "Reopen current file with the default VS Code editor",

            action: () => {
                vscode.postMessage({
                    type: "openWithDefaultEditor"
                });
            }
        },

        { sep: true },

        {
            label: "Find in Directory",
            title: crypto
                ? "Detect crypto files in directory"
                : "Available only in crypto mode",
            disabled: !crypto,
            action: () => {
                if (!crypto) {
                    return;
                }

                vscode.postMessage({
                    type: "openDirectory"
                });
            }
        },

        {
            label: "Reload from Disk",
            title: readOnly
                ? "Reload read-only vault from disk"
                : "Reload current file from disk",
            action: () => {
                vscode.postMessage({
                    type: "reload"
                });
            }
        },

        {
            label: "Show Info",
            title: crypto
                ? "Show current crypto file information"
                : readOnly
                    ? `Show ${format || "vault"} information`
                    : "Show current database information",
            disabled: app.vaultLocked,
            action: () => {
                if (app.vaultLocked) {
                    return;
                }

                byId("dbinfo-body").innerHTML =
                    '<div class="empty">Loading...</div>';

                byId("dbinfo-title").textContent = crypto
                    ? "File Info"
                    : readOnly
                        ? "Vault Info"
                        : "Database Info";

                openModal("dbinfo-modal");

                vscode.postMessage({
                    type: "getDbInfo",
                    entryId: app.selectedEntryId
                });
            }
        }
    ];

    openDropdown(button, items);
}
