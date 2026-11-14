import { byId } from "../dom";
import { vscode } from "../globals";
import { openModal } from "../modals";
import { openDropdown } from "../contextMenu";
import { app, isCryptoFileView, isReadOnlyVault, vaultFormat } from "../state";

import type { MenuItem } from "../types";

export function openFileMenu(
    button: HTMLElement
): void {
    const crypto = isCryptoFileView();
    const readOnly = isReadOnlyVault();
    const format = vaultFormat();
    const vcard = app.state.selectedArchivePath?.toLowerCase().endsWith(".vcf") === true;

    const items: MenuItem[] = [
        {
            label: "Open",
            title: "Open vault or crypto file",
            action: () => { vscode.postMessage({type: "openDb"}); }
        },
        {
            label: "Open with Default Editor",
            title: "Reopen current file with the default VS Code editor",
            action: () => { vscode.postMessage({type: "openWithDefaultEditor"}); }
        },
        {sep: true},
        {
            label: "Find in Directory",
            title: crypto ? "Detect supported files in directory" : "Available only in file mode",
            disabled: !crypto,
            action: () => {
                if (!crypto) {
                    return;
                }

                vscode.postMessage({type: "openDirectory"});
            }
        },
        {
            label: "Reload from Disk",
            title: readOnly ? "Reload read-only file from disk" : "Reload current file from disk",
            action: () => { vscode.postMessage({type: "reload"}); }
        },
        {sep: true}
    ];

    if (vcard) {
        items.push(
            {
                label: "Show Decoded Info",
                title: "Show all contacts with decoded names and contact fields",
                action: () => {
                    byId("dbinfo-body").innerHTML = '<div class="empty">Loading...</div>';
                    byId("dbinfo-title-label").textContent = "Decoded vCard Info";
                    openModal("dbinfo-modal");
                    vscode.postMessage({type: "showDecodedVcardInfo"});
                }
            },
            {sep: true},
            {
                label: "Convert to...",
                title: "Convert contacts to Text, YAML, JSON, vCard 3.0, or vCard 4.0",
                action: () => {
                    if (!app.selectedEntryId) {
                        return;
                    }

                    vscode.postMessage({ type: "prepareCryptoConversion", entryId: app.selectedEntryId, initialTab: "convert" });
                }
            },
            {sep: true}
        );
    }

    items.push({
        label: "Properties",
        title: vcard ? "Show vCard file information" : crypto
            ? "Show current crypto file information" : readOnly
                ? `Show ${format || "vault"} information` : "Show current database information",
        disabled: app.vaultLocked,
        action: () => {
            if (app.vaultLocked) {
                return;
            }

            byId("dbinfo-body").innerHTML = '<div class="empty">Loading...</div>';
            byId("dbinfo-title-label").textContent = vcard ? "vCard Properties" : crypto ? "Properties" : readOnly ? "Vault Info" : "Database Info";
            openModal("dbinfo-modal");
            vscode.postMessage({type: "getDbInfo", entryId: vcard ? null : app.selectedEntryId});}
    });

    openDropdown(button, items);
}
