import { showMenu } from "./menu";
import { vscode } from "../globals";
import { byId, closestElement } from "../dom";
import { openEntryModal, openModal } from "../modals";
import { app, isCryptoFileView, isReadOnlyVault } from "../state";

import type { MenuItem } from "../types";
import type { GroupView } from "../../../vault";

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
    if (app.vaultLocked) {
        return;
    }

    if (app.state.vaultFormat === "archive") {
        const isArchiveRoot = groupId === "archive-root";
        const archiveEncrypted = hasEncryptedArchiveEntries();

        if (isArchiveRoot) {
            const folderName = archiveExtractionFolderName(app.state.tree.name);

            const items: MenuItem[] = [
                { label: "Extract all to...", action: () => {vscode.postMessage({type: "extractArchiveAll"}); }},
                { label: `Extract all to "${folderName}"`, action: () => {vscode.postMessage({type: "extractArchiveToFolder"}); }},
                { sep: true }
            ];

            if (archiveEncrypted) {
                items.push({ label: "Change Password...",
                    title: app.archiveUnlocked ? "Change the archive password" : "Unlock the archive before changing its password",
                    disabled: !app.archiveUnlocked,

                    action: () => {
                        if (!app.archiveUnlocked) {
                            return;
                        }

                        vscode.postMessage({type: "prepareArchivePasswordChange"});
                    }
                });

                items.push({
                    label: "Delete Password",
                    title: app.archiveUnlocked ? "Remove password protection from the archive" : "Unlock the archive before removing its password",
                    disabled: !app.archiveUnlocked,

                    action: () => {
                        if (!app.archiveUnlocked) {
                            return;
                        }

                        vscode.postMessage({type: "deleteArchivePassword"});
                    }
                });
            } else {
                items.push({
                    label: "Set Password...",
                    title: "Protect the archive with a password",
                    action: () => {vscode.postMessage({type: "prepareArchivePasswordSet"});}
                });
            }

            items.push({sep: true});
            items.push({label: "Show Info",

                action: () => {
                    byId("dbinfo-title-label").textContent = "Archive Info";
                    byId("dbinfo-body").innerHTML = '<div class="empty">' + "Loading..." + "</div>";

                    openModal("dbinfo-modal");
                    vscode.postMessage({type: "getDbInfo"});
                }
            });

            showMenu(x, y, items);

            return;
        }

        const items: MenuItem[] = [
            { label: "Extract Folder to...", action: () => {vscode.postMessage({type: "extractArchiveFolder", groupId}); }},
            { label: "Extract all to...", action: () => {vscode.postMessage({type: "extractArchiveAll"}); }},
            { sep: true },
            { label: "Create Folder...", action: () => {vscode.postMessage({type: "createArchiveFolder", groupId}); }},
            { label: "Delete Folder...", action: () => {vscode.postMessage({type:"deleteArchiveFolder", groupId}); }},
            { sep: true },
            { label: "Add File...", action: () => {vscode.postMessage({type: "addArchiveFile", groupId}); }}
        ];

        showMenu(x, y, items);

        return;
    }

    if (isCryptoFileView() || isReadOnlyVault()) {
        return;
    }

    showMenu(x, y, [
        { label: "New Entry", action: () => {openEntryModal(null, groupId); }},
        { label: "New Folder", action: () => {vscode.postMessage({type: "createGroup", parentId: groupId}); }},
        { sep: true },
        { label: "Rename", action: () => {vscode.postMessage({type: "renameGroup", groupId}); }},
        { label: "Delete", action: () => {vscode.postMessage({type: "deleteGroup", groupId}); }}
    ]);
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

        for (const child of group.groups) {
            if (walk(child)) {
                return true;
            }
        }

        return false;
    };

    return walk(app.state.tree);
}

function archiveExtractionFolderName(
    archiveName: string
): string {
    const lowerName = archiveName.toLowerCase();

    if (lowerName.endsWith(".zip.bak")) {
        return archiveName.slice(0, -8);
    }

    if (lowerName.endsWith(".zip")) {
        return archiveName.slice(0, -4);
    }

    return archiveName;
}
