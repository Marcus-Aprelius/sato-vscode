
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

    const header = document.createElement("div");
    header.className = "private-key-header";

    const title = document.createElement("h3");
    title.textContent = "Private Key";

    const copyButton = createCopyIconButton("Copy Private Key");

    copyButton.disabled = !privateKey;

    copyButton.addEventListener("click", () => {
        if (!privateKey) {
            return;
        }

        vscode.postMessage({
            type: "copyText",
            text: privateKey
        });
    });

    header.appendChild(title);
    header.appendChild(copyButton);
    container.appendChild(header);

    const pre = document.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.style.wordBreak = "break-all";
    pre.textContent = privateKey;

    container.appendChild(pre);
}
