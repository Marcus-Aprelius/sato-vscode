import { showMenu } from "./menu";
import { vscode } from "../globals";
import { renderStatus } from "../status";
import { openEntryModal } from "../modals";
import { updateMainActionButton } from "../buttons";
import { clearPrivateKeyValue, renderDetails } from "../details";

import {
    app,
    entryIndex,
    isReadOnlyVault
} from "../state";

import type { MenuItem } from "../types";

export function openEntryMenu(
    x: number,
    y: number,
    entryId: string
): void {
    if (app.vaultLocked) {
        return;
    }

    const entry = entryIndex.get(entryId);

    if (entry && entry.readOnly) {
        const items: MenuItem[] = [];

        if (entry.values?.Summary) {
            items.push({
                label: "Copy Summary",
                action: () => {vscode.postMessage({type: "copyText", text: entry.values?.Summary || ""});}
            });
        }

        if (entry.values?.["File path"]) {
            items.push({
                label: "Copy File Path",
                action: () => {vscode.postMessage({type: "copyText", text: entry.values?.["File path"] || ""});
                }
            });
        }

        if (entry.hasPrivateKey) {
            if (items.length > 0) {
                items.push({sep: true});
            }

            items.push({
                label: app.privateKeyVisible ? "Hide Private Key" : "Show Private Key",
                icon: app.privateKeyVisible ? "codicon-eye" : "codicon-eye-closed",
                title: app.privateKeyVisible ? "Hide private key" : "Show private key",

                action: () => {
                    if (app.privateKeyVisible) {
                        app.privateKeyVisible = false;

                        clearPrivateKeyValue(entryId);
                        renderDetails();
                        renderStatus();
                        updateMainActionButton();

                        return;
                    }

                    vscode.postMessage({type: "revealPrivateKey", entryId});
                }
            });
        }

        if (items.length > 0) {
            showMenu(x, y, items);
        }

        return;
    }

    if (entry && isReadOnlyVault()) {
        showMenu(x, y,
            [
                {
                    label: "Copy Username",
                    disabled: !entry.username,

                    action: () => {vscode.postMessage({type: "copySecret", entryId, field: "UserName"});}
                },
                {
                    label: "Copy Password",
                    disabled: !entry.hasPassword,
                    action: () => { vscode.postMessage({type: "copySecret", entryId, field: "Password"});}
                },
                {
                    label: "Copy URL",
                    disabled: !entry.url,
                    action: () => {vscode.postMessage({type: "copySecret", entryId, field: "URL"});}
                },
                {
                    label: "Copy Notes",
                    disabled: !entry.notes,
                    action: () => {vscode.postMessage({type: "copySecret", entryId, field: "Notes"});}
                }
            ]
        );

        return;
    }

    showMenu(x, y,
        [
            {
                label: "Copy Username",
                action: () => {vscode.postMessage({type: "copySecret", entryId, field: "UserName"});}
            },
            {
                label: "Copy Password",
                action: () => {vscode.postMessage({type: "copySecret", entryId, field: "Password"});}
            },
            {
                label: "Copy URL",
                action: () => {vscode.postMessage({type: "copySecret", entryId, field: "URL"});}
            },
            { sep: true },
            {
                label: "Edit Entry",
                action: () => {openEntryModal(entryId);}
            },
            {
                label: "Duplicate Entry",
                action: () => {vscode.postMessage({type: "duplicateEntry", entryId});}
            },
            {
                label: "Delete Entry",
                action: () => {vscode.postMessage({type: "deleteEntry", entryId});}
            }
        ]
    );
}
