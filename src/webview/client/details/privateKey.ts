import { vscode } from "../globals";
import { createCopyIconButton } from "../dom";

const privateKeyCache = new Map<string, string>();

export function setPrivateKeyValue(
    entryId: string,
    value: string
): void {
    privateKeyCache.set(entryId, value);
}

export function clearPrivateKeyValue(entryId: string): void {
    privateKeyCache.delete(entryId);
}

export function clearAllPrivateKeyValues(): void {
    privateKeyCache.clear();
}

export function getPrivateKeyValue(entryId: string): string {
    return privateKeyCache.get(entryId) || "";
}

export function renderPrivateKeyBlock(
    container: HTMLElement,
    entryId: string
): void {
    const privateKey = getPrivateKeyValue(entryId);
    const actions = document.createElement("div");
    actions.className = "private-key-actions";

    const copyButton = createCopyIconButton("Copy Private Key");
    copyButton.disabled = !privateKey;

    copyButton.addEventListener("click", () => {
        if (!privateKey) {
            return;
        }

        vscode.postMessage({type: "copyText", text: privateKey});
    });

    actions.appendChild(copyButton);
    container.appendChild(actions);

    const pre = document.createElement("pre");

    pre.className = "private-key-content";
    pre.textContent = privateKey;

    container.appendChild(pre);
}
