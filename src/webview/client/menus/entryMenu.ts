import type { MenuItem } from "../types";
import { vscode } from "../globals";
import { app, getSelectedEntry, isCryptoFileView } from "../state";
import { openDropdown } from "../contextMenu";
import { openEntryModal } from "../modals";

export function openEntryMenu(button: HTMLElement): void {
    const crypto = isCryptoFileView();
    const entry = getSelectedEntry();

    const items: MenuItem[] = [
        {
            label: "Add",
            title: crypto
                ? "Not available for crypto files"
                : "Create new entry",
            disabled: crypto,
            action: () => {
                openEntryModal(null, app.selectedGroupId);
            }
        },

        {
            label: "Edit",
            title: crypto
                ? "Not available for crypto files"
                : "Edit selected entry",
            disabled: crypto || !entry,
            action: () => {
                if (!entry) {
                    return;
                }

                openEntryModal(entry.id);
            }
        },

        {
            label: "Duplicate",
            title: crypto
                ? "Not available for crypto files"
                : "Duplicate selected entry",
            disabled: crypto || !entry,
            action: () => {
                if (!entry) {
                    return;
                }

                vscode.postMessage({
                    type: "duplicateEntry",
                    entryId: entry.id
                });
            }
        },

        { sep: true },

        {
            label: "Delete",
            title: crypto
                ? "Not available for crypto files"
                : "Delete selected entry",
            disabled: crypto || !entry,
            action: () => {
                if (!entry) {
                    return;
                }

                vscode.postMessage({
                    type: "deleteEntry",
                    entryId: entry.id
                });
            }
        }
    ];

    openDropdown(button, items);
}
