
import type { MenuItem } from "./types";
import { byId, closestElement } from "./dom";
import { app, entryIndex, isCryptoFileView } from "./state";
import { vscode } from "./globals";
import { openEntryModal } from "./modals";
import {
    clearPrivateKeyValue,
    renderDetails
} from "./details";
import { renderStatus } from "./status";
import { updateMainActionButton } from "./buttons";

const ctxMenu = (): HTMLElement => byId<HTMLElement>("ctx-menu");

export function closeMenu(): void {
    const menu = ctxMenu();

    menu.classList.remove("open");
    menu.innerHTML = "";
}

export function showMenu(x: number, y: number, items: MenuItem[]): void {
    const menu = ctxMenu();

    closeMenu();

    for (const item of items) {
        if ("sep" in item) {
            const separator = document.createElement("div");
            separator.className = "ctx-sep";
            menu.appendChild(separator);
            continue;
        }

        const element = document.createElement("div");
        element.className = "ctx-item";

        if (item.disabled) {
            element.classList.add("disabled");
        }

        const label = document.createElement("span");
        label.className = "ctx-item-label";
        label.textContent = item.label;

        if (item.icon && item.iconPosition === "left") {
            const icon = document.createElement("span");
            icon.className =
                "codicon " +
                item.icon +
                " ctx-item-icon ctx-item-icon-left" +
                (item.iconTone ? " " + item.iconTone : "");

            element.appendChild(icon);
        }

        element.appendChild(label);

        if (item.icon && item.iconPosition !== "left") {
            const icon = document.createElement("span");
            icon.className =
                "codicon " +
                item.icon +
                " ctx-item-icon ctx-item-icon-right" +
                (item.iconTone ? " " + item.iconTone : "");

            element.appendChild(icon);
        }

        if (item.title) {
            element.title = item.title;
        }

        element.addEventListener("click", (event) => {
            event.stopPropagation();

            if (item.disabled) {
                return;
            }

            closeMenu();
            item.action();
        });

        menu.appendChild(element);
    }

    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.classList.add("open");

    const rect = menu.getBoundingClientRect();

    if (rect.right > window.innerWidth) {
        menu.style.left = window.innerWidth - rect.width - 4 + "px";
    }

    if (rect.bottom > window.innerHeight) {
        menu.style.top = window.innerHeight - rect.height - 4 + "px";
    }
}

export function openDropdown(button: HTMLElement, items: MenuItem[]): void {
    const rect = button.getBoundingClientRect();

    showMenu(rect.left, rect.bottom + 2, items);
}

export function setupGroupsPaneContextMenu(): void {
    const pane = document.querySelector(".groups-pane");

    if (!pane) {
        return;
    }

    pane.addEventListener("contextmenu", (event) => {
        const mouseEvent = event as MouseEvent;

        if (app.vaultLocked) {
            return;
        }

        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();

        const row = closestElement(
            mouseEvent.target,
            ".group-node"
        ) as HTMLElement | null;

        if (row && row.dataset && row.dataset.groupId) {
            return;
        }

        openGroupMenu(
            mouseEvent.clientX,
            mouseEvent.clientY,
            app.selectedGroupId
        );
    });
}

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
                action: () =>
                    vscode.postMessage({
                        type: "copyText",
                        text: entry.values?.Summary || ""
                    })
            });
        }

        if (entry.values?.["File path"]) {
            items.push({
                label: "Copy File Path",
                action: () =>
                    vscode.postMessage({
                        type: "copyText",
                        text: entry.values?.["File path"] || ""
                    })
            });
        }

        if (entry.hasPrivateKey) {
            if (items.length) {
                items.push({
                    sep: true
                });
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

                    vscode.postMessage({
                        type: "revealPrivateKey",
                        entryId
                    });
                }
            });
        }

        if (items.length) {
            showMenu(x, y, items);
        }

        return;
    }

    showMenu(x, y, [
        {
            label: "Copy Username",
            action: () => vscode.postMessage({
                type: "copySecret",
                entryId,
                field: "UserName"
            })
        },
        {
            label: "Copy Password",
            action: () => vscode.postMessage({
                type: "copySecret",
                entryId,
                field: "Password"
            })
        },
        {
            label: "Copy URL",
            action: () => vscode.postMessage({
                type: "copySecret",
                entryId,
                field: "URL"
            })
        },
        {
            sep: true
        },
        {
            label: "Edit Entry",
            action: () => openEntryModal(entryId)
        },
        {
            label: "Duplicate Entry",
            action: () => vscode.postMessage({
                type: "duplicateEntry",
                entryId
            })
        },
        {
            label: "Delete Entry",
            action: () => vscode.postMessage({
                type: "deleteEntry",
                entryId
            })
        }
    ]);
}

export function openGroupMenu(x: number, y: number, groupId: string): void {
    if (app.vaultLocked || isCryptoFileView()) {
        return;
    }

    showMenu(x, y, [
        {
            label: "New Entry",
            action: () => openEntryModal(null, groupId)
        },
        {
            label: "New Folder",
            action: () => vscode.postMessage({
                type: "createGroup",
                parentId: groupId
            })
        },
        {
            sep: true
        },
        {
            label: "Rename",
            action: () => vscode.postMessage({
                type: "renameGroup",
                groupId
            })
        },
        {
            label: "Delete",
            action: () => vscode.postMessage({
                type: "deleteGroup",
                groupId
            })
        }
    ]);
}
