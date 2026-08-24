import type { ClientEntry } from "../types";
import { createButton, createCopyIconButton } from "../dom";
import { vscode } from "../globals";
import { app } from "../state";
import { updateMainActionButton } from "../buttons";
import { renderStatus } from "../status";
import { renderDetails } from "./index";

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
        const containerUnlocked = isUnlockedCryptoContainer(entry);
        const openPgp = isOpenPgpMessage(entry);

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

function isCryptoContainer(
    entry: ClientEntry
): boolean {
    const type = entry.values?.Type || "";
    const protection = entry.values?.Protection || "";
    const encryption = entry.values?.Encryption || "";
    const status = entry.values?.Status || "";
    const encryptedPkcs8 = type === "PKCS#8 Private Key" && (protection === "Password encrypted" || status === "Locked");
    const encryptedPpk = type === "PuTTY Private Key" && (status === "Locked" || (encryption !== "" && encryption.toLowerCase() !== "none"));
    const encryptedSshKey = type === "OpenSSH Private Key" && ( status === "Locked" || protection === "Password encrypted" );

    return (
        entry.readOnly === true &&
        (
            type === "PKCS#12 Container" ||
            type === "Java KeyStore" ||
            type === "Java Cryptography Extension KeyStore" ||
            type === "OpenPGP Encrypted Message" ||
            encryptedPkcs8 ||
            encryptedPpk ||
            encryptedSshKey
        )
    );
}


function isUnlockedCryptoContainer(entry: ClientEntry): boolean {
    return entry.values?.Status === "Unlocked";
}

function isOpenPgpMessage(entry: ClientEntry): boolean {
    return entry.values?.Type === "OpenPGP Encrypted Message";
}
