import type { ClientEntry } from "../types";
import { createButton, createCopyIconButton } from "../dom";
import { vscode } from "../globals";
import { app } from "../state";
import { updateMainActionButton } from "../buttons";
import { renderStatus } from "../status";
import { renderDetails } from "./index";

import {
    isCryptoContainer,
    isCryptoContainerUnlocked,
    isOpenPgpMessage
} from "../crypto/containerTypes";

import {
    countCryptoEmptyValues,
    emptyValuesButtonText,
    emptyValuesButtonTitle
} from "./emptyValues";

import {
    clearPrivateKeyValue,
    getPrivateKeyValue,
    renderPrivateKeyBlock
} from "./privateKey";

export function renderCryptoDetails(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const emptyValuesCount = countCryptoEmptyValues(entry);

    const actions = document.createElement("div");
    actions.className = "actions";

    const toggleEmpty = createButton(
        app.showEmptyValues
            ? "btn primary crypto-toggle-empty-btn"
            : "btn danger crypto-toggle-empty-btn",
        emptyValuesButtonText(
            app.showEmptyValues,
            emptyValuesCount
        )
    );

    toggleEmpty.disabled = emptyValuesCount === 0;
    toggleEmpty.title = emptyValuesButtonTitle(
        app.showEmptyValues,
        emptyValuesCount
    );

    toggleEmpty.addEventListener("click", () => {
        if (emptyValuesCount === 0) {
            return;
        }

        app.showEmptyValues = !app.showEmptyValues;

        renderDetails();
        renderStatus();
    });

    actions.appendChild(toggleEmpty);

    if (isCryptoContainer(entry)) {
        const containerUnlocked = isCryptoContainerUnlocked(entry);
        const openPgp = isOpenPgpMessage(entry);
        const ageFile = entry.values?.Type === "age Encrypted File";

        const containerButton = createButton(
            containerUnlocked
                ? "btn danger crypto-container-lock-btn"
                : "btn primary crypto-container-lock-btn",
            openPgp
                ? (
                    containerUnlocked
                        ? "Hide Decrypted Content"
                        : "Decrypt Message"
                )
                : ageFile
                    ? (
                        containerUnlocked
                            ? "Hide Decrypted Content"
                            : "Decrypt File"
                    )
                    : (
                        containerUnlocked
                            ? "Lock Container"
                            : "Unlock Container"
                    )
        );

        containerButton.addEventListener("click", () => {
            if (containerUnlocked) {
                vscode.postMessage({
                    type: "lockCryptoContainer",
                    entryId: entry.id
                });

                return;
            }

            vscode.postMessage({
                type: "prepareCryptoUnlock",
                entryId: entry.id
            });
        });

        actions.appendChild(containerButton);
    }

    if (entry.hasPrivateKey) {
        const togglePrivateKey = createButton(
            app.privateKeyVisible
                ? "btn primary crypto-toggle-pk-btn"
                : "btn danger crypto-toggle-pk-btn",
            app.privateKeyVisible
                ? "Hide Private Key"
                : "Show Private Key"
        );

        togglePrivateKey.addEventListener("click", () => {
            if (app.privateKeyVisible) {
                app.privateKeyVisible = false;
                clearPrivateKeyValue(entry.id);

                renderDetails();
                renderStatus();
                updateMainActionButton();

                return;
            }

            vscode.postMessage({
                type: "revealPrivateKey",
                entryId: entry.id
            });
        });

        actions.appendChild(togglePrivateKey);
    }

    container.appendChild(actions);

    renderCryptoValuesTable(container, entry);

    if (entry.hasPrivateKey && app.privateKeyVisible) {
        const privateKey = getPrivateKeyValue(entry.id);

        if (privateKey) {
            renderPrivateKeyBlock(container, entry.id);
        }
    }
}

function renderCryptoValuesTable(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const table = document.createElement("table");
    const fields = entry.fields || [];

    for (const field of fields) {
        const text = entry.values && entry.values[field] !== undefined
            ? entry.values[field]
            : "";

        if (!app.showEmptyValues && !text) {
            continue;
        }

        const tr = document.createElement("tr");

        const tdLabel = document.createElement("td");
        tdLabel.className = "label";
        tdLabel.textContent = field;

        const tdValue = document.createElement("td");

        const value = document.createElement("div");
        value.className = "value";

        const span = document.createElement("span");
        span.textContent = text || "(empty)";

        value.appendChild(span);

        const copy = createCopyIconButton("Copy");
        copy.disabled = !text;

        copy.addEventListener("click", () => {
            if (!text) {
                return;
            }

            vscode.postMessage({
                type: "copyText",
                text
            });
        });

        value.appendChild(copy);

        tdValue.appendChild(value);
        tr.appendChild(tdLabel);
        tr.appendChild(tdValue);
        table.appendChild(tr);
    }

    container.appendChild(table);
}
