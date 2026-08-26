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

        element.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();

                if (item.disabled) {
                    return;
                }

                closeMenu();
                item.action();
            }
        );

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

export function openDropdown(
    button: HTMLElement,
    items: MenuItem[]
): void {
    const rect = button.getBoundingClientRect();

    showMenu(rect.left, rect.bottom + 2, items);
}
