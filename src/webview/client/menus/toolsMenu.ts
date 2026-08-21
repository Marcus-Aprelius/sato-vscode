import { vscode } from "../globals";
import { openModal } from "../modals";
import type { MenuItem } from "../types";
import { openDropdown } from "../contextMenu";

import {
    app,
    getSelectedEntry,
    isCryptoFileView,
    isReadOnlyVault
} from "../state";

export function openToolsMenu(button: HTMLElement): void {
    const crypto = isCryptoFileView();
    const readOnly = isReadOnlyVault();
    const entry = getSelectedEntry();

    const cryptoContainer = isCryptoContainer(entry);
    const cryptoContainerUnlocked = isCryptoContainerUnlocked(entry);
    const openPgpMessage = isOpenPgpMessage(entry);

    const databaseActionUnavailable = crypto || readOnly;
    const items: MenuItem[] = [
        {
            label: app.vaultLocked
                ? "Unlock Database"
                : "Lock Database",

            title: crypto
                ? "Not available for crypto files"
                : readOnly
                    ? "Not available for read-only vaults"
                    : app.vaultLocked
                        ? "Unlock current database"
                        : "Lock current database",

            icon: app.vaultLocked
                ? "codicon-unlock"
                : "codicon-lock",

            iconPosition: "left",

            iconTone: app.vaultLocked
                ? "locked"
                : "unlocked",

            disabled: databaseActionUnavailable,

            action: () => {
                if (databaseActionUnavailable) {
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

        {
            sep: true
        },

        {
            label: openPgpMessage
                ? (
                    cryptoContainerUnlocked
                        ? "Hide Decrypted Content"
                        : "Decrypt Message"
                )
                : (
                    cryptoContainerUnlocked
                        ? "Lock Container"
                        : "Unlock Container"
                ),

            title: openPgpMessage
                ? (
                    cryptoContainerUnlocked
                        ? "Hide decrypted OpenPGP content"
                        : "Decrypt current OpenPGP message"
                )
                : (
                    cryptoContainerUnlocked
                        ? "Lock current crypto container"
                        : "Unlock current crypto container"
                ),

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

                vscode.postMessage({
                    type: "prepareCryptoUnlock",
                    entryId: entry.id
                });
            }
        },

        {
            sep: true
        },

        {
            label: "Password Generator",
            title: app.vaultLocked
                ? "Unlock the database first"
                : "Open password generator",
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
        type === "Java KeyStore" ||
        type === "OpenPGP Encrypted Message"
    );
}

function isCryptoContainerUnlocked(
    entry: ReturnType<typeof getSelectedEntry>
): boolean {
    return entry?.values?.Status === "Unlocked";
}

function isOpenPgpMessage(
    entry: ReturnType<typeof getSelectedEntry>
): boolean {
    return (
        entry?.values?.Type ===
        "OpenPGP Encrypted Message"
    );
}
