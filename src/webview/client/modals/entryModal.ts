import { vscode } from "../globals";
import { byId, maybeById } from "../dom";
import { closeModal, openModal } from "./modalLifecycle";
import { generateWithDefaults, updateEntryStrength } from "../generator";

import type { EntryFormFields } from "../types";

import {
    app,
    entryIndex,
    isReadOnlyVault
} from "../state";

export function openEntryModal(entryId: string | null, groupId?: string): void {
    if (app.vaultLocked || isReadOnlyVault()) {
        return;
    }

    const entry = entryId ? entryIndex.get(entryId) : undefined;

    if (entry?.readOnly) {
        return;
    }

    app.editingEntryId = entryId || null;
    app.editingGroupId = groupId || app.selectedGroupId;

    byId("entry-modal-title").textContent = entryId ? "Edit Entry" : "New Entry";
    byId<HTMLInputElement>("ef-title").value = "";
    byId<HTMLInputElement>("ef-username").value = "";
    byId<HTMLInputElement>("ef-password").value = "";
    byId<HTMLInputElement>("ef-password").type = "password";
    byId("ef-toggle").textContent = "Show";
    byId<HTMLInputElement>("ef-url").value = "";
    byId<HTMLTextAreaElement>("ef-notes").value = "";
    updateEntryStrength();
    openModal("entry-modal");

    if (entryId) {
        vscode.postMessage({type: "getEntryDetail", entryId});
    } else {
        byId<HTMLInputElement>("ef-title").focus();
    }
}

export function fillEntryModal(detail: EntryFormFields): void {
    byId<HTMLInputElement>("ef-title").value = detail.title;
    byId<HTMLInputElement>("ef-username").value = detail.username;
    byId<HTMLInputElement>("ef-password").value = detail.password;
    byId<HTMLInputElement>("ef-url").value = detail.url;
    byId<HTMLTextAreaElement>("ef-notes").value = detail.notes;

    updateEntryStrength();
    byId<HTMLInputElement>("ef-title").focus();
}

export function bindEntryModalActions(): void {
    maybeById("ef-cancel")?.addEventListener("click", closeModal);

    maybeById("ef-toggle")?.addEventListener("click", () => {
        const password = byId<HTMLInputElement>("ef-password");
        const toggle = byId("ef-toggle");

        if (password.type === "password") {
            password.type = "text";
            toggle.textContent = "Hide";
        } else {
            password.type = "password";
            toggle.textContent = "Show";
        }
    });

    maybeById("ef-password")?.addEventListener("input", updateEntryStrength);

    maybeById("ef-generate")?.addEventListener("click", () => {
        byId<HTMLInputElement>("ef-password").value = generateWithDefaults();
        updateEntryStrength();
    });

    maybeById("ef-save")?.addEventListener("click", () => {
        const fields: EntryFormFields = {
            title: byId<HTMLInputElement>("ef-title").value.trim(),
            username: byId<HTMLInputElement>("ef-username").value,
            password: byId<HTMLInputElement>("ef-password").value,
            url: byId<HTMLInputElement>("ef-url").value,
            notes: byId<HTMLTextAreaElement>("ef-notes").value
        };

        if (!fields.title) {
            byId<HTMLInputElement>("ef-title").focus();
            return;
        }

        if (app.editingEntryId) {
            vscode.postMessage({type: "updateEntry", entryId: app.editingEntryId, fields});
        } else {
            vscode.postMessage({type: "createEntry", groupId: app.editingGroupId, fields});
        }

        closeModal();
    });
}
