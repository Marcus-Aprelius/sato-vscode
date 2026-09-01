import { showMenu } from "./menu";
import { vscode } from "../globals";
import { closestElement } from "../dom";
import { openEntryModal } from "../modals";

import {
    app,
    isCryptoFileView,
    isReadOnlyVault
} from "../state";

export function setupGroupsPaneContextMenu(): void {
    const pane = document.querySelector(".groups-pane");

    if (!pane) {
        return;
    }

    pane.addEventListener(
        "contextmenu",
        (event) => {const mouseEvent = event as MouseEvent;

            if (app.vaultLocked || isReadOnlyVault()) {
                return;
            }

            mouseEvent.preventDefault();
            mouseEvent.stopPropagation();

            const row = closestElement(mouseEvent.target, ".group-node") as HTMLElement | null;

            if (row && row.dataset && row.dataset.groupId) {
                return;
            }

            openGroupMenu(mouseEvent.clientX, mouseEvent.clientY, app.selectedGroupId);
        }
    );
}

export function openGroupMenu(
    x: number,
    y: number,
    groupId: string
): void {
    if ( app.vaultLocked || isCryptoFileView() || isReadOnlyVault()) {
        return;
    }

    showMenu(
        x,
        y,
        [
            {
                label: "New Entry",
                action: () => {openEntryModal(null, groupId);}
            },
            {
                label: "New Folder",
                action: () => {vscode.postMessage({type: "createGroup", parentId: groupId});}
            },
            { sep: true },
            {
                label: "Rename",
                action: () => {vscode.postMessage({type: "renameGroup", groupId});}
            },
            {
                label: "Delete",
                action: () => {vscode.postMessage({type: "deleteGroup", groupId});}
            }
        ]
    );
}
