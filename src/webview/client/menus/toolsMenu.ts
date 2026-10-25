import { vscode } from "../globals";
import { openDropdown } from "../contextMenu";
import { app, getSelectedEntry,isCryptoFileView, isReadOnlyVault } from "../state";
import { openBase64Converter, openEmptyCryptoConverter, openModal, openQrCodeGenerator } from "../modals";
import {isCryptoContainer, isCryptoContainerUnlocked, isOpenPgpMessage, isVeraCryptContainer } from "../crypto/containerTypes";
import { clearPasswordGenerator } from "../generator";

import type { GroupView } from "../../../vault";
import type { MenuItem } from "../types";

export function openToolsMenu(
    button: HTMLElement
): void {
    const crypto = isCryptoFileView();
    const archive = app.state.vaultFormat === "archive";
    const archiveEncrypted = archive && hasEncryptedArchiveEntries();
    const readOnly = isReadOnlyVault();
    const entry = getSelectedEntry();
    const cryptoContainer = isCryptoContainer(entry) && !isVeraCryptContainer(entry);
    const cryptoContainerUnlocked = isCryptoContainerUnlocked(entry);
    const openPgpMessage = isOpenPgpMessage(entry);
    const databaseActionUnavailable = crypto || readOnly;

    const items: MenuItem[] = [
        {
            label: app.vaultLocked ? "Unlock Database" : "Lock Database",

            title: crypto ? "Not available for crypto files" : readOnly
                ? "Not available for read-only vaults"
                : app.vaultLocked ? "Unlock current database" : "Lock current database",

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
                ? cryptoContainerUnlocked ? "Hide Decrypted Content" : "Decrypt Message"
                : cryptoContainerUnlocked ? "Lock Container" : "Unlock Container",

            title: openPgpMessage
                ? cryptoContainerUnlocked ? "Hide decrypted OpenPGP content" : "Decrypt current OpenPGP message"
                : cryptoContainerUnlocked ? "Lock current crypto container" : "Unlock current crypto container",

            icon: cryptoContainerUnlocked? "codicon-eye" : "codicon-eye-closed",
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
            label: "Certificates Converter",
            title: "Open certificate, crypto file & Key converter",
            disabled: !crypto,

            action: () => {
                if (!crypto) {
                    return;
                }

                openEmptyCryptoConverter();
            }
        },

        {
            label: "Base64 Converter",
            title: "Encode or decode Base64, Base32, Base32hex, and Hex text",
            action: () => { openBase64Converter();}
        },

        {
            label: "QR Code Converter",
            title: "Create a QR code from text, URL, password, or other data",
            action: () => {openQrCodeGenerator();}
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

                clearPasswordGenerator();
                openModal("gen-modal");
            }
        }
    ];

    if (archiveEncrypted) {
        items.splice(2, 0,
            {
                label: app.archiveUnlocked ? "Lock Archive" : "Unlock Archive...",
                title: app.archiveUnlocked ? "Remove the archive password from memory" : "Enter the password for the current archive",
                icon: app.archiveUnlocked ? "codicon-lock" : "codicon-unlock",
                iconPosition: "left",
                iconTone: app.archiveUnlocked ? "unlocked" : "locked",

                action: () => {vscode.postMessage({type: app.archiveUnlocked ? "lockArchive" : "prepareArchiveUnlock"});}
            },
            { sep: true }
        );
    }

    openDropdown(button, items);
}

function hasEncryptedArchiveEntries(): boolean {
    const walk = (
        group: GroupView
    ): boolean => {
        for (const entry of group.entries) {
            if (entry.values?.Encrypted === "Yes") {
                return true;
            }
        }

        return group.groups.some(walk);
    };

    return walk(app.state.tree);
}
