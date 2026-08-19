import type { EntryView, GroupView } from "../../vault";
import { byId, closestElement } from "./dom";
import { app, entryIndex, groupIndex, resetCryptoUiState } from "./state";
import { renderDetails } from "./details";
import { updateMainActionButton } from "./buttons";
import { openEntryMenu } from "./contextMenu";

export function renderEntries(): void {
    const list = byId<HTMLElement>("entry-list");
    const titleEl = byId<HTMLElement>("entries-title");

    list.oncontextmenu = (event) => {
        if (app.vaultLocked) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const row = closestElement(event.target, ".entry-row") as HTMLElement | null;

        if (row && row.dataset && row.dataset.entryId) {
            return;
        }

        if (app.selectedEntryId) {
            openEntryMenu(event.clientX, event.clientY, app.selectedEntryId);
        }
    };

    list.innerHTML = "";

    let entries: EntryView[] = [];

    if (app.searchQuery) {
        collectMatchingEntries(app.state.tree, entries);
        titleEl.textContent = "Search results (" + entries.length + ")";
    } else {
        const group = groupIndex.get(app.selectedGroupId);
        entries = group ? group.entries.slice() : [];
        titleEl.textContent = (group ? group.name : "Entries") + " (" + entries.length + ")";
    }

    if (!entries.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = app.searchQuery
            ? "No entries match."
            : "No entries in this group.";
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

    row.addEventListener("click", () => {
        selectEntry(entry.id);
    });

    row.addEventListener("contextmenu", (event) => {
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
    app.showVaultEmptyValues = true;

    renderEntries();
    renderDetails();
    updateMainActionButton();
}

function entryMatches(entry: EntryView): boolean {
    if (!app.searchQuery) {
        return true;
    }

    const query = app.searchQuery.toLowerCase();

    const valuesText = entry.values
        ? Object.values(entry.values).join(" ")
        : "";

    return (
        entry.title +
        " " +
        entry.username +
        " " +
        entry.url +
        " " +
        entry.notes +
        " " +
        valuesText
    )
        .toLowerCase()
        .includes(query);
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
