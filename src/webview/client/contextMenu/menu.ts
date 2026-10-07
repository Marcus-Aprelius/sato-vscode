import { byId } from "../dom";

import type { MenuItem } from "../types";

const ctxMenu = (): HTMLElement => byId<HTMLElement>("ctx-menu");

export function closeMenu(): void {
    const menu = ctxMenu();

    menu.classList.remove("open");
    menu.innerHTML = "";
}

export function showMenu(
    x: number,
    y: number,
    items: MenuItem[]
): void {
    const menu = ctxMenu();

    closeMenu();
    appendMenuItems(menu, items);
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.classList.add("open");
    keepMenuInsideViewport(menu);
}

function appendMenuItems(
    container: HTMLElement,
    items: MenuItem[]
): void {
    for (const item of items) {
        if ("sep" in item) {
            const separator = document.createElement("div");
            separator.className = "ctx-sep";
            container.appendChild(separator);
            continue;
        }

        const element = document.createElement("div");
        element.className = "ctx-item";

        if (item.disabled) {
            element.classList.add("disabled");
        }

        if (Array.isArray(item.children)) {
            element.classList.add("ctx-item-parent");
        }

        if (item.icon && item.iconPosition === "left") {
            element.appendChild(createMenuIcon(item.icon, "ctx-item-icon-left", item.iconTone));
        }

        const label = document.createElement("span");

        label.className = "ctx-item-label";
        label.textContent = item.label;
        element.appendChild(label);

        if (Array.isArray(item.children)) {
            const arrow = document.createElement("span");

            arrow.className = "codicon codicon-chevron-right " + "ctx-item-icon ctx-item-icon-right";
            element.appendChild(arrow);

            const submenu = document.createElement("div");

            submenu.className = "ctx-submenu";
            appendMenuItems(submenu, item.children);
            element.appendChild(submenu);
            element.addEventListener("mouseenter", () => {positionSubmenu(submenu);});

        } else if (item.icon && item.iconPosition !== "left") {
            element.appendChild(createMenuIcon(item.icon, "ctx-item-icon-right", item.iconTone));

        }

        if (item.title) {
            element.title = item.title;
        }

        element.addEventListener("click", event => {
            event.stopPropagation();

            if (item.disabled) {
                return;
            }

            if (Array.isArray(item.children)) {
                return;
            }

            if (typeof item.action !== "function") {
                return;
            }

            closeMenu();
            item.action();
        });

        container.appendChild(element);
    }
}

function createMenuIcon(
    iconName: string,
    positionClass: string,
    tone?: "locked" | "unlocked"
): HTMLElement {
    const icon = document.createElement("span");

    icon.className = "codicon " + iconName + " ctx-item-icon " + positionClass + (tone ? " " + tone : "");

    return icon;
}

function keepMenuInsideViewport(
    menu: HTMLElement
): void {
    const rect = menu.getBoundingClientRect();

    if (rect.right > window.innerWidth) {
        menu.style.left = Math.max(4, window.innerWidth - rect.width - 4) + "px";
    }

    if (rect.bottom > window.innerHeight) {
        menu.style.top = Math.max(4, window.innerHeight - rect.height - 4) + "px";
    }
}

function positionSubmenu(
    submenu: HTMLElement
): void {
    submenu.classList.add("open");

    const rect = submenu.getBoundingClientRect();

    submenu.classList.remove("open");
    submenu.classList.toggle("open-left", rect.right > window.innerWidth);

    const adjustedRect = submenu.getBoundingClientRect();

    if (adjustedRect.bottom > window.innerHeight) {
        submenu.style.top = Math.min(0, window.innerHeight - adjustedRect.bottom - 4) + "px";
    }
}

export function openDropdown(
    button: HTMLElement,
    items: MenuItem[]
): void {
    const rect = button.getBoundingClientRect();

    showMenu(rect.left, rect.bottom + 2, items);
}
