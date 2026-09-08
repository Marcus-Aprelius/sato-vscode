import { vscode } from "../globals";
import type { MenuItem } from "../types";
import { openDropdown } from "../contextMenu";
import {
    app,
    groupIndex,
    isCryptoFileView,
    isReadOnlyVault,
    parentGroupOf
} from "../state";

export function openFolderMenu(button: HTMLElement): void {
    const crypto = isCryptoFileView();
    const readOnly = isReadOnlyVault();
    const group = groupIndex.get(app.selectedGroupId);
    const parentId = parentGroupOf.get(app.selectedGroupId);
    const rootGroup = app.selectedGroupId === app.state.tree.id;
    const unavailable = crypto || readOnly;
    const unavailableTitle = crypto ? "Not available for crypto files" : readOnly ? "Not available in read-only mode" : "";

    const items: MenuItem[] = [
        {
            label: "Add",
            title: unavailable ? unavailableTitle : "Create new folder",
            disabled: unavailable,
            action: () => {
                if (unavailable) {
                    return;
                }
                vscode.postMessage({type: "createGroup", parentId: app.selectedGroupId});
            }
        },

        {
            label: "Rename",
            title: unavailable ? unavailableTitle : rootGroup ? "The root folder cannot be renamed" : "Rename selected folder",
            disabled: unavailable || !group || rootGroup,
            action: () => {
                if (unavailable || !group || rootGroup) {
                    return;
                }

                vscode.postMessage({type: "renameGroup", groupId: app.selectedGroupId});
            }
        },

        {
            label: "Duplicate",
            title: "Not implemented",
            disabled: true,
            action: () => {}
        },

        { sep: true},

        {
            label: "Delete",
            title: unavailable ? unavailableTitle : rootGroup ? "The root folder cannot be deleted" : "Delete selected folder",
            disabled: unavailable || !group || rootGroup || !parentId,
            action: () => {
                if (unavailable || !group || rootGroup || !parentId) {
                    return;
                }

                vscode.postMessage({type: "deleteGroup", groupId: app.selectedGroupId});
            }
        }
    ];

    openDropdown(button, items);
}
