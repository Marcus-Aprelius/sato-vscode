import { byId } from "../dom";
import { vscode } from "../globals";
import { openModal } from "../modals";
import type { MenuItem } from "../types";
import { openDropdown } from "../contextMenu";
import { app, isCryptoFileView } from "../state";

export function openFileMenu(button: HTMLElement): void {
    const crypto = isCryptoFileView();

    const items: MenuItem[] = [
        {
            label: "Open",
            title: "Open vault or crypto file",
            action: () => vscode.postMessage({
                type: "openDb"
            })
        },

        { sep: true },

        {
            label: "Find in Directory",
            title: crypto
                ? "Detect crypto files in directory"
                : "Available only in crypto mode",
            disabled: !crypto,
            action: () => vscode.postMessage({
                type: "openDirectory"
            })
        },

        {
            label: "Reload from Disk",
            title: "Reload current file from disk",
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
