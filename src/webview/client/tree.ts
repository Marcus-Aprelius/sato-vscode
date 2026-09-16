import { byId } from "./dom";
import { vscode } from "./globals";
import { renderStatus } from "./status";
import { renderDetails } from "./details";
import { renderEntries } from "./entries";
import { openGroupMenu, showMenu} from "./contextMenu";
import { updateMainActionButton } from "./buttons";

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

function openCryptoFileMenu(
    x: number,
    y: number,
    entry: EntryView
): void {
    const certificateConvertible = entry.values?.Type === "X.509 Certificate" && (entry.values.Encoding === "PEM" || entry.values.Encoding === "DER");
    const openSshPublicKeyConvertible = entry.values?.Type === "OpenSSH Public Key";
    const convertible = certificateConvertible || openSshPublicKeyConvertible;

    showMenu(x, y,
        [
            {
                label: "Convert...",
                title: convertible ? "Convert certificate to another supported format" : "No conversions are available for this file",
                disabled: !convertible,

                action: () => {
                    if (!convertible) {
                        return;
                    }

                    vscode.postMessage({type:"prepareCryptoConversion", entryId: entry.id});
                }
            }
        ]
    );
}

