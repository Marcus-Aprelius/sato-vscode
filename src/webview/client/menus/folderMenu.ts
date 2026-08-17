import type { MenuItem } from "../types";
import { vscode } from "../globals";
import { app, groupIndex, isCryptoFileView, parentGroupOf } from "../state";
import { openDropdown } from "../contextMenu";

export function openFolderMenu(button: HTMLElement): void {
    const crypto = isCryptoFileView();

    const group = groupIndex.get(app.selectedGroupId);
    const parentId = parentGroupOf.get(app.selectedGroupId);

    const rootGroup =
        app.selectedGroupId === app.state.tree.id;

    const items: MenuItem[] = [
        {
            label: "Add",
            title: crypto
                ? "Not available for crypto files"
                : "Create new folder",
            disabled: crypto,
            action: () => {
                vscode.postMessage({
                    type: "createGroup",
                    parentId: app.selectedGroupId
                });
            }
        },

        {
            label: "Rename",
            title: crypto
                ? "Not available for crypto files"
                : "Rename selected folder",
            disabled: crypto || !group || rootGroup,
            action: () => {
                vscode.postMessage({
                    type: "renameGroup",
                    groupId: app.selectedGroupId
                });
            }
        },

        {
            label: "Duplicate",
            title: "Not implemented",
            disabled: true,
            action: () => {}
        },

        {
            sep: true
        },

        {
            label: "Delete",
            title: crypto
                ? "Not available for crypto files"
                : "Delete selected folder",
            disabled:
                crypto ||
                !group ||
                rootGroup ||
                !parentId,
            action: () => {
                vscode.postMessage({
                    type: "deleteGroup",
                    groupId: app.selectedGroupId
                });
            }
        }
    ];

    openDropdown(button, items);
}
