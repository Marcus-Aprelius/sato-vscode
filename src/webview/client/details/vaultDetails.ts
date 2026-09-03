
import { vscode } from "../globals";
import { renderDetails } from "./index";
import { openEntryModal } from "../modals";
import { app, isReadOnlyVault } from "../state";
import { createButton, createCopyIconButton } from "../dom";

import type { ClientEntry } from "../types";

import {
    countVaultEmptyValues,
    emptyValuesButtonText,
    emptyValuesButtonTitle,
    getVaultDetailFields,
    getVaultFieldPreviewValue
} from "./emptyValues";

export function renderVaultDetails(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const emptyValuesCount = countVaultEmptyValues(entry);

    const emptyActions = document.createElement("div");
    emptyActions.className = "actions";

    const toggleEmpty = createButton(
        app.showVaultEmptyValues
            ? "btn primary crypto-toggle-empty-btn"
            : "btn danger crypto-toggle-empty-btn",
        emptyValuesButtonText(app.showVaultEmptyValues, emptyValuesCount)
    );

    toggleEmpty.disabled = emptyValuesCount === 0;
    toggleEmpty.title = emptyValuesButtonTitle(app.showVaultEmptyValues, emptyValuesCount);

    toggleEmpty.addEventListener("click", () => {
        if (emptyValuesCount === 0) {
            return;
        }

        app.showVaultEmptyValues = !app.showVaultEmptyValues;
        renderDetails();
    });

    emptyActions.appendChild(toggleEmpty);
    container.appendChild(emptyActions);

    renderVaultValuesTable(container, entry);

    if (!isReadOnlyVault()) {
        renderVaultActions(container, entry);
    }
}

function renderVaultValuesTable(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const table = document.createElement("table");
    const fields = getVaultDetailFields(entry);

    for (const field of fields) {
        const previewValue =
            getVaultFieldPreviewValue(entry, field);

        if (!app.showVaultEmptyValues && !previewValue) {
            continue;
        }

        const tr = document.createElement("tr");
        const tdLabel = document.createElement("td");

        tdLabel.className = "label";
        tdLabel.textContent = field;

        const tdValue = document.createElement("td");
        const value = document.createElement("div");

        value.className = "value";

        if (field === "Password") {
            renderPasswordField(value, entry, field);
        } else {
            renderPlainField(value, entry, field);
        }

        const copy = createCopyIconButton("Copy");

        copy.disabled = !previewValue;

        copy.addEventListener("click", () => {
            if (!previewValue) {
                return;
            }

            vscode.postMessage({type: "copySecret", entryId: entry.id, field});
        });

        value.appendChild(copy);
        tdValue.appendChild(value);
        tr.appendChild(tdLabel);
        tr.appendChild(tdValue);
        table.appendChild(tr);
    }

    container.appendChild(table);
}

function renderPasswordField(
    value: HTMLElement,
    entry: ClientEntry,
    field: string
): void {
    const input = document.createElement("input");

    input.type = "password";
    input.value = entry.hasPassword ? "••••••••" : "";
    input.readOnly = true;
    input.dataset.field = field;
    input.dataset.entryId = entry.id;

    value.appendChild(input);

    const reveal = createButton("btn field-action-btn", "Show");
    reveal.disabled = !entry.hasPassword;

    reveal.addEventListener("click", () => {
        if (!entry.hasPassword) {
            return;
        }

        if (input.type === "password") {
            vscode.postMessage({type: "revealSecret", entryId: entry.id, field});

            return;
        }

        input.type = "password";
        input.value = "••••••••";
        reveal.textContent = "Show";
    });

    value.appendChild(reveal);

    if (app.settings?.showPasswordsByDefault && entry.hasPassword) {
        vscode.postMessage({type: "revealSecret", entryId: entry.id, field});
    }
}

function renderPlainField(
    value: HTMLElement,
    entry: ClientEntry,
    field: string
): void {
    const fieldText = getVaultFieldPreviewValue(entry, field);
    const span = document.createElement("span");

    span.textContent = fieldText || "(empty)";

    value.appendChild(span);

    if (field === "URL") {
        const go = createButton("btn field-action-btn", "Go");

        go.disabled = !fieldText;
        go.title = fieldText ? "Open URL" : "URL is empty";

        go.addEventListener("click", () => {
            if (!fieldText) {
                return;
            }

            vscode.postMessage({type: "openUrl", url: fieldText});
        });

        value.appendChild(go);
    }
}

function renderVaultActions(
    container: HTMLElement,
    entry: ClientEntry
): void {
    const actions = document.createElement("div");
    actions.className = "actions";

    const editButton = createButton("btn primary", "Edit");
    editButton.addEventListener("click", () => {openEntryModal(entry.id);});
    actions.appendChild(editButton);

    const duplicateButton = createButton("btn", "Duplicate");
    duplicateButton.addEventListener("click", () => {vscode.postMessage({type: "duplicateEntry", entryId: entry.id});});
    actions.appendChild(duplicateButton);

    const deleteButton = createButton("btn danger", "Delete");
    deleteButton.addEventListener("click", () => {vscode.postMessage({type: "deleteEntry", entryId: entry.id});});
    actions.appendChild(deleteButton);

    container.appendChild(actions);
}
