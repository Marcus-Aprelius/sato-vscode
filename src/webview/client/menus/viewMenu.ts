
import type { MenuItem } from "../types";
import { vscode } from "../globals";
import { app, getSelectedEntry } from "../state";
import { openDropdown } from "../contextMenu";
import {
    clearPrivateKeyValue,
    renderDetails
} from "../details";

import { renderStatus } from "../status";
import { updateMainActionButton } from "../buttons";

export function openViewMenu(button: HTMLElement): void {
    const entry = getSelectedEntry();

    const isCryptoEntry = !!(
        entry &&
        entry.readOnly
    );

    const emptyValuesCount = entry
        ? isCryptoEntry
            ? countCryptoEmptyValues(entry)
            : countVaultEmptyValues(entry)
        : 0;

    const showEmptyValues = isCryptoEntry
        ? app.showEmptyValues
        : app.showVaultEmptyValues;

    const hasPrivateKey = !!(
        entry &&
        entry.readOnly &&
        entry.hasPrivateKey
    );

    const items: MenuItem[] = [
        {
            label: showEmptyValues
                ? "✓ Show Empty Values"
                : "Show Empty Values",

            title: emptyValuesCount === 0
                ? "No empty values"
                : showEmptyValues
                    ? "Hide empty values"
                    : "Show empty values",

            disabled: emptyValuesCount === 0,

            action: () => {
                if (emptyValuesCount === 0) {
                    return;
                }

                if (isCryptoEntry) {
                    app.showEmptyValues =
                        !app.showEmptyValues;
                } else {
                    app.showVaultEmptyValues =
                        !app.showVaultEmptyValues;
                }

                renderDetails();
                renderStatus();
                updateMainActionButton();
            }
        },

        {
            label: app.privateKeyVisible
                ? "✓ Show Primary Key"
                : "Show Primary Key",

            title: hasPrivateKey
                ? (
                    app.privateKeyVisible
                        ? "Hide private key"
                        : "Show private key"
                )
                : "No private key available",

            disabled: !hasPrivateKey,

            action: () => {
                if (!entry || !hasPrivateKey) {
                    return;
                }

                if (app.privateKeyVisible) {
                    app.privateKeyVisible = false;
                    clearPrivateKeyValue(entry.id);

                    renderDetails();
                    renderStatus();
                    updateMainActionButton();

                    return;
                }

                vscode.postMessage({
                    type: "revealPrivateKey",
                    entryId: entry.id
                });
            }
        },

        {
            sep: true
        },

        {
            label: app.settings.showStatusBar
                ? "✓ Show Status Bar"
                : "Show Status Bar",

            title: app.settings.showStatusBar
                ? "Hide status bar"
                : "Show status bar",

            action: () => {
                const next = {
                    ...app.settings,
                    showStatusBar: !app.settings.showStatusBar
                };

                app.settings = next;

                vscode.postMessage({
                    type: "updateSettings",
                    settings: next
                });

                renderStatus();
            }
        }
    ];

    openDropdown(button, items);
}

function countCryptoEmptyValues(
    entry: NonNullable<ReturnType<typeof getSelectedEntry>>
): number {
    const fields = entry.fields || [];
    let count = 0;

    for (const field of fields) {
        const value = entry.values && entry.values[field] !== undefined
            ? entry.values[field]
            : "";

        if (!value) {
            count++;
        }
    }

    return count;
}

function countVaultEmptyValues(
    entry: NonNullable<ReturnType<typeof getSelectedEntry>>
): number {
    const fields = [
        "UserName",
        "URL",
        "Password",
        "Notes",
        ...entry.fields.filter((field) =>
            !["Title", "UserName", "URL", "Password", "Notes"].includes(field)
        )
    ];

    let count = 0;

    for (const field of fields) {
        if (!getVaultFieldPreviewValue(entry, field)) {
            count++;
        }
    }

    return count;
}

function getVaultFieldPreviewValue(
    entry: NonNullable<ReturnType<typeof getSelectedEntry>>,
    field: string
): string {
    if (field === "UserName") {
        return entry.username;
    }

    if (field === "URL") {
        return entry.url;
    }

    if (field === "Password") {
        return entry.hasPassword ? "********" : "";
    }

    if (field === "Notes") {
        return entry.notes;
    }

    return "";
}
