import { vscode } from "../globals";
import { openDropdown } from "../contextMenu";
import { openBase64Converter, openEmptyCryptoConverter, openModal } from "../modals";
import {isCryptoContainer, isCryptoContainerUnlocked, isOpenPgpMessage} from "../crypto/containerTypes";

import type { MenuItem } from "../types";

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
            label: app.vaultLocked ? "Unlock Database" : "Lock Database",

            title: crypto
                ? "Not available for crypto files": readOnly
                ? "Not available for read-only vaults" : app.vaultLocked
                ? "Unlock current database" : "Lock current database",

            icon: app.vaultLocked ? "codicon-unlock" : "codicon-lock",
            iconPosition: "left",
            iconTone: app.vaultLocked ? "locked" : "unlocked",
            disabled: databaseActionUnavailable,

            action: () => {
                if (databaseActionUnavailable) {
                    return;
                }

                if (app.vaultLocked) {
                    openModal("unlock-modal");
                    return;
                }

                vscode.postMessage({type: "lock"});
            }
        },

        { sep: true },

        {
            label: openPgpMessage
                ? (cryptoContainerUnlocked ? "Hide Decrypted Content" : "Decrypt Message")
                : (cryptoContainerUnlocked ? "Lock Container" : "Unlock Container"),

            title: openPgpMessage
                ? (cryptoContainerUnlocked ? "Hide decrypted OpenPGP content" : "Decrypt current OpenPGP message")
                : (cryptoContainerUnlocked ? "Lock current crypto container" : "Unlock current crypto container"),

            icon: cryptoContainerUnlocked ? "codicon-eye" : "codicon-eye-closed",
            iconPosition: "left",
            iconTone: cryptoContainerUnlocked ? "unlocked" : "locked",
            disabled: !cryptoContainer,

            action: () => {
                if (!entry || !cryptoContainer) {
                    return;
                }

                if (cryptoContainerUnlocked) {
                    vscode.postMessage({type: "lockCryptoContainer", entryId: entry.id});
                    return;
                }

                vscode.postMessage({type: "prepareCryptoUnlock", entryId: entry.id});
            }
        },

        { sep: true },

        {
            label: "Converter",
            title: "Open crypto file converter",
            disabled: !crypto,

            action: () => {
                if (!crypto) {
                    return;
                }

                openEmptyCryptoConverter();
            }
        },

        {
            label: "Base64 Encode / Decode",
            title: "Encode or decode Base64, Base32, Base32hex, and Hex text",

            action: () => {openBase64Converter();}
        },

        { sep: true },
        
        {
            label: "Password Generator",
            title: app.vaultLocked ? "Unlock the database first" : "Open password generator",
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
