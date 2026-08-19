

import { byId } from "../dom";
import { app, entryIndex } from "../state";
import { updateMainActionButton } from "../buttons";

import { renderCryptoDetails } from "./cryptoDetails";
import { renderVaultDetails } from "./vaultDetails";

import {
    clearAllPrivateKeyValues,
    clearPrivateKeyValue,
    setPrivateKeyValue
} from "./privateKey";

export {
    clearAllPrivateKeyValues,
    clearPrivateKeyValue,
    setPrivateKeyValue
};

export function renderDetails(): void {
    const container = byId<HTMLElement>("details");

    container.innerHTML = "";

    if (!app.selectedEntryId) {
        const empty = document.createElement("div");

        empty.className = "empty";
        empty.textContent = "Select an entry to view its fields.";

        container.appendChild(empty);
        updateMainActionButton();

        return;
    }

    const entry = entryIndex.get(app.selectedEntryId);

    if (!entry) {
        updateMainActionButton();
        return;
    }

    const title = document.createElement("h2");

    title.textContent = entry.title;
    container.appendChild(title);

    if (entry.readOnly) {
        renderCryptoDetails(container, entry);
        updateMainActionButton();

        return;
    }

    renderVaultDetails(container, entry);
    updateMainActionButton();
}
