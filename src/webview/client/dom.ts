export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);

    if (!element) {
        throw new Error(`Missing DOM element: #${id}`);
    }

    return element as T;
}

export function maybeById<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

export function closestElement(target: EventTarget | null, selector: string): Element | null {
    if (!target) {
        return null;
    }

    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

    return element && typeof element.closest === "function" ? element.closest(selector) : null;
}

export function clearElement(element: HTMLElement): void {
    element.innerHTML = "";
}

export function createDiv(className?: string): HTMLDivElement {
    const div = document.createElement("div");

    if (className) {
        div.className = className;
    }

    return div;
}

export function createButton(className: string, text: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = className;
    button.textContent = text;

    return button;
}

export function createCopyIconButton(title = "Copy"): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "icon-btn";
    button.title = title;
    button.setAttribute("aria-label", title);

    const icon = document.createElement("span");
    icon.className = "codicon codicon-copy";

    button.appendChild(icon);

    return button;
}
