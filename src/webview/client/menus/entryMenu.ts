import { vscode } from "../globals";
import { openDropdown } from "../contextMenu";
import { openEntryModal } from "../modals";

import type { MenuItem } from "../types";

import {
    app,
    getSelectedEntry,
    isCryptoFileView,
    isReadOnlyVault
} from "../state";

export function openEntryMenu(button: HTMLElement): void {
    const crypto = isCryptoFileView();
    const readOnly = isReadOnlyVault();
    const entry = getSelectedEntry();

    const unavailable =
        crypto || readOnly;

    const unavailableTitle = crypto
        ? "Not available for crypto files"
        : readOnly
            ? "Not available in read-only mode"
            : "";

    const items: MenuItem[] = [
        {
            label: "Add",
            title: unavailable
                ? unavailableTitle
                : "Create new entry",

            disabled: unavailable,
            action: () => {
                if (unavailable) {
                    return;
                }

                openEntryModal(null, app.selectedGroupId);
            }
        },

        {
            label: "Edit",

            title: unavailable
                ? unavailableTitle
                : "Edit selected entry",

            disabled:
                unavailable ||
                !entry,

            action: () => {
                if (
                    unavailable ||
                    !entry
                ) {
                    return;
                }

                openEntryModal(entry.id);
            }
        },

        {
            label: "Duplicate",
            title: unavailable
                ? unavailableTitle
                : "Duplicate selected entry",
            disabled:
                unavailable ||
                !entry,

            action: () => {
                if (
                    unavailable ||
                    !entry
                ) {
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
            title: unavailable
                ? unavailableTitle
                : "Delete selected entry",
            disabled: unavailable || !entry,
            action: () => {
                if (unavailable || !entry ) {
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
