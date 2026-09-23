import { byId } from "./dom";
import { vscode } from "./globals";
import { openModal } from "./modals";
import { renderStatus } from "./status";
import { renderDetails } from "./details";
import { renderEntries } from "./entries";
import { updateMainActionButton } from "./buttons";
import { openGroupMenu, showMenu} from "./contextMenu";

import { 
    app,
    groupIndex,
    resetCryptoUiState,
    isCryptoFileView
} from "./state";

import type { EntryView, GroupView} from "../../vault";

export function renderTree(): void {

    const treeElement = byId<HTMLElement>("tree");
    const titleElement = byId<HTMLElement>("groups-title");

    treeElement.innerHTML = "";

    if (isCryptoFileView()) {
        const fileCount = app.state.tree.groups.length;

        titleElement.textContent = `Crypto Files (${fileCount})`;

        for (const group of app.state.tree.groups) {
            treeElement.appendChild(renderGroupNode(group, 0));
        }

        return;
    }

    titleElement.textContent = "Groups";
    treeElement.appendChild(renderGroupNode(app.state.tree, 0));
}

function renderGroupNode(group: GroupView, depth: number): HTMLElement {
    const wrap = document.createElement("div");
    const row = document.createElement("div");

    row.className = "group-node" + (group.id === app.selectedGroupId ? " active" : "");
    row.style.paddingLeft = 6 + depth * 10 + "px";
    row.dataset.groupId = group.id;

    const caret = document.createElement("span");
    caret.className = "group-caret";
    caret.textContent = group.groups.length ? "▸" : "";
    row.appendChild(caret);

    const label = document.createElement("span");
    label.className = "group-label";
    label.textContent = group.name;
    row.appendChild(label);

    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = group.entries.length ? String(group.entries.length) : "";
    row.appendChild(count);
    row.addEventListener("click", (event) => {event.stopPropagation(); selectGroup(group.id);});

    row.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();

        selectGroup(group.id);

        if (isCryptoFileView()) {
            const entry = group.entries[0];

            if (!entry) {
                return;
            }

            openCryptoFileMenu(event.clientX, event.clientY, entry);

            return;
        }

        openGroupMenu(event.clientX, event.clientY, group.id);
    });

    wrap.appendChild(row);

    if (group.groups.length) {
        const ul = document.createElement("ul");

        for (const child of group.groups) {
            const li = document.createElement("li");
            li.appendChild(renderGroupNode(child, depth + 1));
            ul.appendChild(li);
        }

        wrap.appendChild(ul);
    }

    return wrap;
}

export function selectGroup(groupId: string): void {
    if (app.vaultLocked) {
        return;
    }

    app.selectedGroupId = groupId;
    const group = groupIndex.get(groupId);

    if (group && group.entries.length > 0) {
        app.selectedEntryId = group.entries[0].id;
    } else {
        app.selectedEntryId = null;
    }

    resetCryptoUiState();
    app.showVaultEmptyValues = app.settings.showEmptyValuesByDefault;

    renderTree();
    renderEntries();
    renderDetails();
    renderStatus();
    updateMainActionButton();
}

function isConvertibleCryptoFile(
    entry: EntryView
): boolean {
    return (entry.values?.Type === "X.509 Certificate" && (entry.values.Encoding === "PEM" || entry.values.Encoding === "DER")) ||
        entry.values?.Type === "OpenSSH Public Key" || entry.values?.Type === "RSA Private Key" || entry.values?.Type === "RSA Public Key" ||
        entry.values?.Type === "EC Private Key" || entry.values?.Type === "EC Public Key" ||
            (entry.values?.Type === "Private Key" && (entry.values.Algorithm === "RSA" || entry.values.Algorithm === "EC")) ||
            entry.values?.Type === "Authenticode Certificate Container";
}

function isExtractableCryptoFile(
    entry: EntryView
): boolean {
    return (
        entry.values?.Type === "Authenticode Certificate Container" || entry.values?.Type === "RSA Private Key" || entry.values?.Type === "EC Private Key" ||
        (entry.values?.Type === "Private Key" && (entry.values.Algorithm === "RSA" || entry.values.Algorithm === "EC"))
    );
}

function openCryptoFileMenu(
    x: number,
    y: number,
    entry: EntryView
): void {

    const convertible = isConvertibleCryptoFile(entry);
    const extractable = isExtractableCryptoFile(entry);
    showMenu(x, y, [
        {
            label: "Show Info",
            title: "Show information about the selected crypto file",

            action: () => {
                byId("dbinfo-body").innerHTML = '<div class="empty">Loading...</div>';
                byId("dbinfo-title-label").textContent = "File Info";
                openModal("dbinfo-modal");

                vscode.postMessage({type: "getDbInfo", entryId: entry.id});
            }
        },
        {sep: true},
        {
            label: "Convert...",
            title: convertible ? "Convert the selected file" : "Conversion is not available for this file",
            disabled: !convertible,

            action: () => {
                if (!convertible) {
                    return;
                }

                vscode.postMessage({type: "prepareCryptoConversion", entryId: entry.id, initialTab: "convert"});
            }
        },
        {
            label: "Extract...",
            title: extractable ? "Extract available content from the selected file" : "Extraction is not available for this file",
            disabled: !extractable,

            action: () => {
                if (!extractable) {
                    return;
                }

                vscode.postMessage({type: "prepareCryptoConversion", entryId: entry.id, initialTab: "extract"});
            }
        }]
    );
}

