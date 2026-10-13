import { vscode } from "./globals";
import type { MenuItem } from "./types";
import { renderDetails } from "./details";
import { byId, closestElement } from "./dom";
import { openEntryMenu, openGroupMenu, showMenu } from "./contextMenu";
import { app, groupIndex, resetCryptoUiState, isCryptoFileView } from "./state";
import { archiveExtractionFolderName } from "../../shared/archiveFileName";

import type { EntryView, GroupView } from "../../vault";

const expandedArchiveGroups = new Set<string>();
const ARCHIVE_TREE_INDENT = 18;
const ARCHIVE_ROW_PADDING = 8;

export function collapseAllArchiveGroups(): void {
    expandedArchiveGroups.clear();
    renderEntries();
}

export function expandAllArchiveGroups(): void {
    expandedArchiveGroups.clear();
    collectArchiveGroupIds(app.state.tree, expandedArchiveGroups);
    renderEntries();
}

export function renderEntries(): void {
    const list = byId<HTMLElement>("entry-list");
    const titleEl = byId<HTMLElement>("entries-title");

    list.oncontextmenu = (event) => {
        if (app.vaultLocked || isCryptoFileView()) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const row = closestElement(event.target, ".entry-row") as HTMLElement | null;

        if (row && row.dataset && row.dataset.entryId) {
            return;
        }

        if (app.state.vaultFormat === "archive") {
            const folderName = archiveExtractionFolderName(app.state.tree.name);
            const selectedArchive = app.state.archives?.find(archive => archive.filePath === app.state.selectedArchivePath);
            const archiveEditable = selectedArchive?.editable === true && selectedArchive.backup !== true;

            const items: MenuItem[] = [
                {
                    label: "Extract all to...",
                    action: () => {vscode.postMessage({type: "extractArchiveAll"}); }
                },
                {
                    label: `Extract all to "${folderName}"`,
                    action: () => {vscode.postMessage({type: "extractArchiveToFolder"}); }
                }
            ];

            if (archiveEditable) {
                items.push(
                    {sep: true},
                    {
                        label: "Create Folder...",
                        action: () => {vscode.postMessage({ type: "createArchiveFolder", groupId: app.selectedGroupId});
                        }
                    },
                    {
                        label: "Add File...",
                        action: () => {vscode.postMessage({type: "addArchiveFile", groupId: app.selectedGroupId});}
                    }
                );
            }

            items.push(
                { sep: true },
                { label: "Collapse All", action: () => {collapseAllArchiveGroups();} },
                { label: "Expand All", action: () => {expandAllArchiveGroups();} },
                { sep: true },
                { label: "Reload from Disk", action: () => {vscode.postMessage({type: "reload" });} }
            );

            showMenu(event.clientX, event.clientY, items);

            return;
        }

        if (app.selectedEntryId) {
            openEntryMenu(event.clientX, event.clientY, app.selectedEntryId);
        }
    };

    list.innerHTML = "";

    if (app.state.vaultFormat === "archive" && !app.searchQuery) {
        renderArchiveEntriesTree(list, titleEl);

        return;
    }

    let entries: EntryView[] = [];

    if (app.searchQuery) {
        collectMatchingEntries(app.state.tree, entries);
        titleEl.textContent = "Search results (" + entries.length + ")";

    } else {
        const group = groupIndex.get(app.selectedGroupId);
        entries = group ? group.entries.slice() : [];

        if (isCryptoFileView()) {
            titleEl.textContent = group ? group.name : "Crypto File";

        } else {
            titleEl.textContent = (group ? group.name : "Entries") + " (" + entries.length + ")";
        }
    }

    if (!entries.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = app.searchQuery ? "No entries match." : "No entries in this group.";
        list.appendChild(empty);
        return;
    }

    for (const entry of entries) {
        list.appendChild(renderEntryRow(entry));
    }
}

function renderEntryRow(entry: EntryView): HTMLElement {
    const row = document.createElement("div");

    row.className = "entry-row" + (entry.id === app.selectedEntryId ? " active" : "");
    row.dataset.entryId = entry.id;

    const info = document.createElement("div");
    info.style.flex = "1";
    info.style.minWidth = "0";

    const title = document.createElement("div");
    title.className = "entry-title";
    title.textContent = entry.title;

    const sub = document.createElement("div");
    sub.className = "entry-sub";
    sub.textContent = entry.username || entry.url || "";

    info.appendChild(title);
    info.appendChild(sub);
    row.appendChild(info);

    if (entry.expired) {
        const badge = document.createElement("span");
        badge.className = "badge expired";
        badge.textContent = "expired";
        row.appendChild(badge);
    }

    if (entry.weak) {
        const badge = document.createElement("span");
        badge.className = "badge weak";
        badge.textContent = "weak";
        row.appendChild(badge);
    }

    row.addEventListener("click", () => {selectEntry(entry.id);});

    row.addEventListener("contextmenu", (event) => {
        if (isCryptoFileView()) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        selectEntry(entry.id);
        openEntryMenu(event.clientX, event.clientY, entry.id);
    });

    return row;
}

export function selectEntry(entryId: string): void {
    if (app.vaultLocked) {
        return;
    }

    app.selectedEntryId = entryId;
    resetCryptoUiState();

    app.showVaultEmptyValues = app.settings.showEmptyValuesByDefault;
    renderEntries();
    renderDetails();
}

function entryMatches(entry: EntryView): boolean {
    if (!app.searchQuery) {
        return true;
    }

    const query = app.searchQuery.toLowerCase();
    const valuesText = entry.values ? Object.values(entry.values).join(" ") : "";

    return (entry.title + " " + entry.username + " " + entry.url + " " + entry.notes + " " + valuesText).toLowerCase().includes(query);
}

function collectMatchingEntries(group: GroupView, out: EntryView[]): void {
    for (const entry of group.entries) {
        if (entryMatches(entry)) {
            out.push(entry);
        }
    }

    for (const child of group.groups) {
        collectMatchingEntries(child, out);
    }
}

function renderArchiveEntriesTree(
    list: HTMLElement,
    titleElement: HTMLElement
): void {
    const root = app.state.tree;

    titleElement.textContent = `${root.name} ` + `(${countArchiveItems(root)})`;

    if (root.groups.length === 0 && root.entries.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "The archive is empty.";

        list.appendChild(empty);
        return;
    }

    for (const group of root.groups) {
        list.appendChild(renderArchiveGroupNode(group, 0));
    }

    for (const entry of root.entries) {
        list.appendChild(renderArchiveEntryNode(entry, 0));
    }
}

function renderArchiveGroupNode(
    group: GroupView,
    depth: number
): HTMLElement {
    const container = document.createElement("div");
    container.className = "archive-tree-group";

    const row = document.createElement("div");
    row.className = "entry-row archive-folder-row";
    row.dataset.groupId = group.id;
    row.style.paddingLeft = `${ARCHIVE_ROW_PADDING}px`;

    const expanded = expandedArchiveGroups.has(group.id);
    const chevron = document.createElement("span");
    chevron.className = "codicon " + (expanded ? "codicon-chevron-down" : "codicon-chevron-right");
    chevron.style.flex = "0 0 auto";

    const folderIcon = document.createElement("span");
    folderIcon.className = "codicon " + (expanded ? "codicon-folder-opened" : "codicon-folder");
    folderIcon.style.flex = "0 0 auto";

    const title = document.createElement("span");
    title.className = "entry-title";
    title.textContent = group.name;
    title.style.flex = "1";
    title.style.minWidth = "0";

    row.appendChild(chevron);
    row.appendChild(folderIcon);
    row.appendChild(title);

    row.addEventListener("click", () => {
        if (expanded) {
            expandedArchiveGroups.delete(group.id);
        } else {
            expandedArchiveGroups.add(group.id);
        }

        renderEntries();
    });

    row.addEventListener(
        "contextmenu",
        event => {
            event.preventDefault();
            event.stopPropagation();

            openGroupMenu(event.clientX, event.clientY, group.id);
        }
    );

    container.appendChild(row);

    if (expanded) {
        const children = document.createElement("div");
        children.className = "archive-tree-children";
        children.style.marginLeft = `${ARCHIVE_TREE_INDENT}px`;

        for (const child of group.groups) {
            children.appendChild(renderArchiveGroupNode(child, depth + 1));
        }

        for (const entry of group.entries) {
            children.appendChild(renderArchiveEntryNode(entry, depth + 1));
        }

        container.appendChild(children);
    }

    return container;
}

function renderArchiveEntryNode(
    entry: EntryView,
    depth: number
): HTMLElement {
    const row = renderEntryRow(entry);
    row.classList.add("archive-file-row");
    row.style.paddingLeft = `${ARCHIVE_ROW_PADDING}px`;

    const icon = document.createElement("span");
    icon.className = "codicon codicon-file";
    icon.style.flex = "0 0 auto";
    row.prepend(icon);

    return row;
}

function countArchiveItems(
    group: GroupView
): number {
    let count = group.groups.length + group.entries.length;

    for (const child of group.groups) {
        count += countArchiveItems(child);
    }

    return count;
}

function collectArchiveGroupIds(
    group: GroupView,
    target: Set<string>
): void {
    for (const child of group.groups) {
        target.add(child.id);

        collectArchiveGroupIds(child, target);
    }
}
