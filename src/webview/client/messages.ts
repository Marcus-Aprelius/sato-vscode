
import { byId } from "./dom";
import { vscode } from "./globals";
import { renderAll } from "./render";
import { renderStatus } from "./status";
import { app, setClientState } from "./state";
import { clearAllPrivateKeyValues, renderDetails, setPrivateKeyValue } from "./details";

import type { ClientInitialState } from "./types";

import {
    closeCryptoContainerUnlockModal,
    closeUnlockModal,
    fillEntryModal,
    openUnlockModal,
    showCryptoContainerUnlockError
} from "./modals";

import {
    setLockButtonState,
    updateMainActionButton,
    updateToolbarForMode
} from "./buttons";

interface InboundMessage {
    type: string;
    [key: string]: unknown;
}

export function bindInboundMessages(): void {
    window.addEventListener("message", (event) => {
        const msg = event.data as InboundMessage;

        if (msg.type === "openUnlockModal") {
            openUnlockModal();
            return;
        }

        if (msg.type === "vaultLocked") {
            renderVaultLockedState();
            return;
        }

        if (msg.type === "unlockFailed") {
            const err = byId<HTMLElement>("unlock-error");
            const input = byId<HTMLInputElement>("unlock-password");

            err.textContent = String(msg.message || "Unlock failed.");
            err.style.display = "";

            input.select();
            input.focus();
            return;
        }

        if (msg.type === "cryptoContainerUnlockFailed") {
            showCryptoContainerUnlockError(
                String(msg.message || "Failed to unlock crypto container.")
            );
            return;
        }

        if (msg.type === "vaultState") {
            clearAllPrivateKeyValues();

            setClientState(msg.state as ClientInitialState);

            closeUnlockModal();
            closeCryptoContainerUnlockModal();

            renderAll();
            updateToolbarForMode();
            updateMainActionButton();
            return;
        }

        if (msg.type === "settingsUpdated") {
            app.settings = msg.settings as ClientInitialState["settings"];

            if (app.selectedEntryId) {
                renderDetails();
            }

            renderStatus();
            updateToolbarForMode();
            updateMainActionButton();
            return;
        }

        if (msg.type === "secretRevealed") {
            const input = document.querySelector(
                'input[data-entry-id="' + msg.entryId + '"][data-field="' + msg.field + '"]'
            ) as HTMLInputElement | null;

            if (input) {
                input.type = "text";
                input.value = String(msg.value || "");

                const container = input.parentElement;
                const reveal = container
                    ? container.querySelector(".field-action-btn")
                    : null;

                if (reveal) {
                    reveal.textContent = "Hide";
                }
            }

            return;
        }

        if (msg.type === "privateKeyRevealed") {
            const entryId = String(msg.entryId || "");
            const value = String(msg.value || "");

            if (!entryId || !value) {
                return;
            }

            app.privateKeyVisible = true;

            setPrivateKeyValue(
                entryId,
                value
            );

            renderDetails();
            renderStatus();
            updateMainActionButton();
            return;
        }

        if (msg.type === "entryDetail") {
            fillEntryModal(msg.detail as {
                title: string;
                username: string;
                password: string;
                url: string;
                notes: string;
            });
            return;
        }

        if (msg.type === "dbInfo") {
            renderDbInfo(msg.info as Record<string, unknown>);
        }
    });
}

function renderVaultLockedState(): void {
    clearAllPrivateKeyValues();

    app.vaultLocked = true;
    app.selectedEntryId = null;
    app.privateKeyVisible = false;
    app.showEmptyValues = false;
    app.searchQuery = "";

    const search = byId<HTMLInputElement>("search");
    search.value = "";

    byId("tree").innerHTML = '<div class="empty">Vault is locked.</div>';
    byId("entries-title").textContent = "Entries";
    byId("entry-list").innerHTML =
        '<div class="empty">Unlock database to view secrets.</div>';
    byId("details").innerHTML =
        '<div class="empty">Unlock database to view details.</div>';

    const bar = byId("statusbar");
    bar.innerHTML = '<span class="item"><strong>Locked</strong></span>';

    setLockButtonState(true);
}

function renderDbInfo(info: Record<string, unknown>): void {
    const body = byId("dbinfo-body");

    body.innerHTML = "";

    const title = byId<HTMLElement>("dbinfo-title");

    if (typeof info.title === "string" && info.title.trim()) {
        title.textContent = info.title;
    }

    if (Array.isArray(info.rows)) {
        renderInfoRows(info.rows as unknown[], body);
        return;
    }

    renderLegacyDbInfo(info, body);
}

function renderInfoRows(
    rows: unknown[],
    body: HTMLElement
): void {
    const table = document.createElement("table");
    table.className = "dbinfo-table";

    for (const row of rows) {
        if (!Array.isArray(row) || row.length < 2) {
            continue;
        }

        const key = String(row[0] || "");
        const value = String(row[1] || "");

        appendInfoRow(table, key, value);
    }

    body.appendChild(table);
}

function renderLegacyDbInfo(
    info: Record<string, unknown>,
    body: HTMLElement
): void {
    const version = String(info.version || "");

    const rows: [string, string][] = [
        ["Name", String(info.name || "(unnamed)")],
        ["Description", String(info.desc || "(empty)")],
        [version === "psafe3" ? "Format version" : "KDBX version", version],
        ["Generator", String(info.generator || "unknown")],
        ["File", String(info.filePath || "")],
        ["File size", String(info.fileSize || "0") + " bytes"],
        ["Groups", String(info.groupCount || "0")],
        ["Entries", String(info.entryCount || "0")],
        ["Recycle bin", info.recycleBinEnabled ? "enabled" : "disabled"]
    ];

    const table = document.createElement("table");
    table.className = "dbinfo-table";

    for (const [key, value] of rows) {
        appendInfoRow(table, key, value);
    }

    body.appendChild(table);
}

function appendInfoRow(
    table: HTMLTableElement,
    key: string,
    value: string
): void {
    const tr = document.createElement("tr");

    const tdKey = document.createElement("td");
    tdKey.className = "label";
    tdKey.textContent = key;

    const tdValue = document.createElement("td");

    if (
        key === "File" ||
        key === "File path" ||
        key === "SHA-256" ||
        key === "Fingerprint SHA-256"
    ) {
        const wrap = document.createElement("div");
        wrap.style.display = "flex";
        wrap.style.alignItems = "center";
        wrap.style.width = "100%";
        wrap.style.gap = "8px";

        const span = document.createElement("span");
        span.textContent = value;
        span.style.flex = "1";
        span.style.minWidth = "0";
        span.style.wordBreak = "break-all";

        const copy = document.createElement("button");
        copy.className = "icon-btn";
        copy.title = "Copy";
        copy.setAttribute("aria-label", "Copy");

        const copyIcon = document.createElement("span");
        copyIcon.className = "codicon codicon-copy";

        copy.appendChild(copyIcon);

        copy.addEventListener("click", () => {
            vscode.postMessage({
                type: "copyText",
                text: value
            });
        });

        wrap.appendChild(span);
        wrap.appendChild(copy);
        tdValue.appendChild(wrap);
    } else {
        tdValue.textContent = value;
    }

    tr.appendChild(tdKey);
    tr.appendChild(tdValue);
    table.appendChild(tr);
}
