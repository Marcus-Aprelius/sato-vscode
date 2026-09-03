import type { ClientEntry } from "../types";

import { app } from "../state";
import { vscode } from "../globals";
import { renderDetails } from "./index";
import { renderStatus } from "../status";
import { updateMainActionButton } from "../buttons";
import { createButton, createCopyIconButton } from "../dom";
import { getPrivateKeyValue, renderPrivateKeyBlock} from "./privateKey";

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

export function renderCryptoDetails(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const emptyValuesCount = countCryptoEmptyValues(entry);

    renderCryptoDetailsTabs(container, entry);

    if (app.detailsTab === "privateKey") {
        renderPrivateKeyTab(container, entry);

        return;
    }

    if (app.detailsTab === "details") {
        renderDetailsTab(container, entry);

        return;
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const toggleEmpty = createButton(app.showEmptyValues
        ? "btn primary crypto-toggle-empty-btn"
        : "btn danger crypto-toggle-empty-btn",
        emptyValuesButtonText(app.showEmptyValues, emptyValuesCount)
    );

    toggleEmpty.disabled = emptyValuesCount === 0;
    toggleEmpty.title = emptyValuesButtonTitle(app.showEmptyValues, emptyValuesCount);

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
            containerUnlocked ? "btn danger crypto-container-lock-btn" : "btn primary crypto-container-lock-btn",
            openPgp
                ? (containerUnlocked ? "Hide Decrypted Content" : "Decrypt Message")
                : ageFile
                    ? (containerUnlocked ? "Hide Decrypted Content" : "Decrypt File")
                    : (containerUnlocked ? "Lock Container" : "Unlock Container")
        );

        containerButton.addEventListener("click", () => {
            if (containerUnlocked) {
                vscode.postMessage({type: "lockCryptoContainer", entryId: entry.id});

                return;
            }

            vscode.postMessage({type: "prepareCryptoUnlock", entryId: entry.id});
        });

        actions.appendChild(containerButton);
    }

    container.appendChild(actions);

    renderCryptoValuesTable(container, entry);

}

function renderCryptoValuesTable(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const table = document.createElement("table");
    const fields = entry.fields || [];

    for (const field of fields) {
        if (field === "Details") {
            continue;
        }

        const text = entry.values && entry.values[field] !== undefined ? entry.values[field] : "";

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

        if (text && field === "Valid to") {
            span.title = formatDaysFromNow(text, "left");
        }

        if (text && field === "Valid from") {
            span.title = formatDaysFromNow(text, "ago");
        }

        if (text && (field === "File size" || field === "Container size")) {
            span.title = formatSizeTooltip(text, "bytes");
        }

        if (text && (field === "Key size" || field === "Key Size")) {
            span.title = formatSizeTooltip(text, "bits");
        }

        value.appendChild(span);

        const copy = createCopyIconButton("Copy");
        copy.disabled = !text;

        copy.addEventListener("click", () => {
            if (!text) {
                return;
            }

            vscode.postMessage({type: "copyText", text});
        });

        value.appendChild(copy);
        tdValue.appendChild(value);
        tr.appendChild(tdLabel);
        tr.appendChild(tdValue);
        table.appendChild(tr);
    }

    container.appendChild(table);
}

function formatDaysFromNow(
    value: string,
    mode: "left" | "ago"
): string {
    const timestamp = Date.parse(value);

    if (Number.isNaN(timestamp)) {
        return "";
    }

    const dayMilliseconds = 24 * 60 * 60 * 1000;
    const difference = mode === "left" ? timestamp - Date.now() : Date.now() - timestamp;
    const days = Math.max(0, mode === "left" ? Math.ceil(difference / dayMilliseconds): Math.floor(difference / dayMilliseconds));
    const unit = days === 1 ? "day" : "days";

    return mode === "left" ? `${days} ${unit} left` : `${days} ${unit} ago`;
}

function formatSizeTooltip(
    value: string,
    unit: "bytes" | "bits"
): string {
    const match = value.match(/^(\d+)\s+(?:bytes|bits?)$/i);

    if (!match) {
        return "";
    }

    const size = Number.parseInt(match[1], 10);

    if (!Number.isFinite(size)) {
        return "";
    }

    if (unit === "bits") {
        return `${Math.ceil(size / 8)} bytes`;
    }

    return `${(size / 1024).toFixed(2)} KB`;
}

function renderCryptoDetailsTabs(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const tabs = document.createElement("div");
    tabs.className = "details-tabs";

    const infoTab = createButton(app.detailsTab === "info" ? "details-tab active" : "details-tab", "Info");
    infoTab.addEventListener("click", () => {app.detailsTab = "info"; renderDetails();});

    tabs.appendChild(infoTab);

    if (entry.values?.Details) {
        const detailsTab = createButton(app.detailsTab === "details" ? "details-tab active" : "details-tab", "Details");

        detailsTab.addEventListener("click", () => {app.detailsTab = "details"; renderDetails();});
        tabs.appendChild(detailsTab);
    }

    if (entry.hasPrivateKey) {
        const privateKeyTab = createButton(app.detailsTab === "privateKey" ? "details-tab active" : "details-tab", "Private Key");

        privateKeyTab.addEventListener("click", () => {
            const privateKey = getPrivateKeyValue(entry.id);

            app.detailsTab = "privateKey";

            if (!privateKey) {
                vscode.postMessage({type: "revealPrivateKey", entryId: entry.id});

                return;
            }

            app.privateKeyVisible = true;
            renderDetails();
            renderStatus();
            updateMainActionButton();
        });

        tabs.appendChild(privateKeyTab);
    }

    container.appendChild(tabs);
}

function renderPrivateKeyTab(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const privateKey =
        getPrivateKeyValue(entry.id);

    if (!privateKey) {
        const loading = document.createElement("div");

        loading.className = "empty";
        loading.textContent = "Loading private key...";

        container.appendChild(loading);
        return;
    }

    app.privateKeyVisible = true;

    renderPrivateKeyBlock(container, entry.id);
}

function renderDetailsTab(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const details = entry.values?.Details || "";
    const fields = parseDetailsFields(details);

    if (fields.length === 0) {
        const empty = document.createElement("div");

        empty.className = "empty";
        empty.textContent = "No details available.";

        container.appendChild(empty);
        return;
    }

    const table = document.createElement("table");

    for (const field of fields) {
        const tr = document.createElement("tr");
        const tdLabel = document.createElement("td");

        tdLabel.className = "label";
        tdLabel.textContent = field.label;

        const tdValue = document.createElement("td");
        const value = document.createElement("div");

        value.className = "value";
        const span = document.createElement("span");
        const displayValue = normalizeDetailsValue(field.value);

        span.textContent = displayValue;
        const sizeTooltip = formatBitsAsKilobytes(displayValue);

        if (sizeTooltip) {
            span.title = sizeTooltip;
        }

        const copy = createCopyIconButton(`Copy ${field.label}`);

        copy.addEventListener("click", () => {vscode.postMessage({type: "copyText", text: field.value});});

        value.appendChild(span);
        value.appendChild(copy);
        tdValue.appendChild(value);

        tr.appendChild(tdLabel);
        tr.appendChild(tdValue);
        table.appendChild(tr);
    }

    container.appendChild(table);
}

interface DetailsField {
    label: string;
    value: string;
}

function parseDetailsFields(
    details: string
): DetailsField[] {
    const fields: DetailsField[] = [];
    const lines = details.replace(/\r\n/g, "\n").split("\n");

    let section = "";
    let current: DetailsField | undefined;

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
            current = undefined;
            continue;
        }

        if (!line.includes(":")) {
            if (line === "Bag Attributes" || line === "Certificate bag" || line === "PKCS7 Data") {
                section = line;
                current = undefined;
                continue;
            }

            if (current) {
                current.value += `\n${line}`;
                continue;
            }

            fields.push({label: section || "Details", value: line});

            continue;
        }

        const separatorIndex = line.indexOf(":");
        const label = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        const fullLabel = section ? `${section}: ${label}` : label;

        current = {label: fullLabel, value};

        fields.push(current);
    }

    return fields;
}

function normalizeDetailsValue(
    value: string
): string {
    return value.replace(
        /^\[(\d+\s+bits?)\]$/i,
        "$1"
    );
}

function formatBitsAsKilobytes(
    value: string
): string {
    const match = value.match(/^(\d+)\s+bits?$/i);

    if (!match) {
        return "";
    }

    const bits = Number.parseInt(match[1], 10);

    if (!Number.isFinite(bits)) {
        return "";
    }

    const kilobytes = bits / 8 / 1024;

    return `${kilobytes.toFixed(2)} KB`;
}
