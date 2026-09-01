import { vscode } from "../globals";
import { renderStatus } from "../status";
import { openDropdown } from "../contextMenu";
import { app, getSelectedEntry } from "../state";
import { updateMainActionButton } from "../buttons";
import { clearPrivateKeyValue, renderDetails } from "../details";
import { countCryptoEmptyValues, countVaultEmptyValues } from "../details/emptyValues";

import type { MenuItem } from "../types";

export function openViewMenu(button: HTMLElement): void {
    
    const entry = getSelectedEntry();
    const isCryptoEntry = !!(entry && entry.readOnly);
    const emptyValuesCount = entry ? isCryptoEntry ? countCryptoEmptyValues(entry) : countVaultEmptyValues(entry) : 0;
    const showEmptyValues = isCryptoEntry ? app.showEmptyValues : app.showVaultEmptyValues;
    const hasPrivateKey = !!(entry && entry.readOnly && entry.hasPrivateKey);

    const items: MenuItem[] = [
        {
            label: showEmptyValues ? "✓ Show Empty Values" : "Show Empty Values",
            title: emptyValuesCount === 0 ? "No empty values" : showEmptyValues ? "Hide empty values" : "Show empty values",
            disabled: emptyValuesCount === 0,

            action: () => {
                if (emptyValuesCount === 0) {
                    return;
                }

                if (isCryptoEntry) {
                    app.showEmptyValues = !app.showEmptyValues;
                } else {
                    app.showVaultEmptyValues = !app.showVaultEmptyValues;
                }

                renderDetails();
                renderStatus();
                updateMainActionButton();
            }
        },

        {
            label: app.privateKeyVisible ? "✓ Show Private Key" : "Show Private Key",
            title: hasPrivateKey ? app.privateKeyVisible ? "Hide private key" : "Show private key" : "No private key available",
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

                vscode.postMessage({type: "revealPrivateKey", entryId: entry.id});
            }
        },

        { sep: true },

        {
            label: app.settings.showStatusBar ? "✓ Show Status Bar" : "Show Status Bar",
            title: app.settings.showStatusBar ? "Hide status bar" : "Show status bar",

            action: () => {
                const next = {...app.settings, showStatusBar: !app.settings.showStatusBar};

                app.settings = next;
                vscode.postMessage({type: "updateSettings", settings: next});

                renderStatus();
            }
        }
    ];

    openDropdown(button, items);
}
