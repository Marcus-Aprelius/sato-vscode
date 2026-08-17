import { vscode } from "../globals";
import { openDropdown } from "../contextMenu";
import { app, getSelectedEntry, isCryptoFileView } from "../state";
import { openCryptoContainerUnlockModal, openModal } from "../modals";

import type { MenuItem } from "../types";

export function openToolsMenu(button: HTMLElement): void {
    const crypto = isCryptoFileView();
    const entry = getSelectedEntry();

    const cryptoContainer = isCryptoContainer(entry);
    const cryptoContainerUnlocked = isCryptoContainerUnlocked(entry);

    const items: MenuItem[] = [
        {
            label: app.vaultLocked ? "Unlock Database" : "Lock Database",
            title: app.vaultLocked
                ? "Unlock current database"
                : "Lock current database",
            icon: app.vaultLocked
                ? "codicon-unlock"
                : "codicon-lock",
            iconPosition: "left",
            iconTone: app.vaultLocked
                ? "locked"
                : "unlocked",
            disabled: crypto,
            action: () => {
                if (crypto) {
                    return;
                }

                if (app.vaultLocked) {
                    openModal("unlock-modal");
                    return;
                }

                vscode.postMessage({
                    type: "lock"
                });
            }
        },

        { sep: true },

        {
            label: cryptoContainerUnlocked
                ? "Lock Container"
                : "Unlock Container",
            title: cryptoContainerUnlocked
                ? "Lock current crypto container"
                : "Unlock current crypto container",
            icon: cryptoContainerUnlocked
                ? "codicon-eye"
                : "codicon-eye-closed",
            iconPosition: "left",
            iconTone: cryptoContainerUnlocked
                ? "unlocked"
                : "locked",
            disabled: !cryptoContainer,
            action: () => {
                if (!entry || !cryptoContainer) {
                    return;
                }

                if (cryptoContainerUnlocked) {
                    vscode.postMessage({
                        type: "lockCryptoContainer",
                        entryId: entry.id
                    });

                    return;
                }

                openCryptoContainerUnlockModal(entry.id);
            }
        },

        { sep: true },

        {
            label: "Password Generator",
            title: "Open password generator",
            disabled: app.vaultLocked,
            action: () => {
                if (app.vaultLocked) {
                    return;
                }

                openModal("gen-modal");
            }
        }
    ];

    openDropdown(button, items);
}

function isCryptoContainer(
    entry: ReturnType<typeof getSelectedEntry>
): boolean {
    if (!entry || !entry.readOnly) {
        return false;
    }

    const type = entry.values?.Type || "";

    return (
        type === "PKCS#12 Container" ||
        type === "Java KeyStore"
    );
}

function isCryptoContainerUnlocked(
    entry: ReturnType<typeof getSelectedEntry>
): boolean {
    return entry?.values?.Status === "Unlocked";
}
