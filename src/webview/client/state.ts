import { readInitialState } from "./globals";

import type { ClientEntry, ClientInitialState } from "./types";

const initialState = readInitialState();

export const app = {
    state: initialState,
    selectedGroupId: initialState.tree.id,
    selectedEntryId: initialState.selectedEntryId || null,
    searchQuery: "",
    settings: initialState.settings,
    vaultLocked: false,

    groupsWidth: 240,
    entriesWidth: 300,

    privateKeyVisible: false,
    showEmptyValues: false,
    showVaultEmptyValues: true,

    editingEntryId: null as string | null,
    editingGroupId: null as string | null
};

export const groupIndex = new Map<string, ClientInitialState["tree"]>();
export const entryIndex = new Map<string, ClientEntry>();
export const parentGroupOf = new Map<string, string>();

export function isCryptoFileView(): boolean {
    return !!(app.state.tree && app.state.tree.name === "Crypto Files");
}

export function isReadOnlyVault(): boolean { 
    return app.state.readOnlyVault === true;
}

export function vaultFormat(): string {
    return app.state.vaultFormat || "";
}

export function getSelectedEntry(): ClientEntry | undefined {
    return app.selectedEntryId ? entryIndex.get(app.selectedEntryId) : undefined;
}

export function selectedEntryHasPrivateKey(): boolean {
    const entry = getSelectedEntry();

    return !!(entry && entry.readOnly && entry.hasPrivateKey);
}

export function resetPrivateKeyState(): void {
    app.privateKeyVisible = false;
}

export function resetCryptoUiState(): void {
    app.privateKeyVisible = false;
    app.showEmptyValues = false;
}

export function reindex(): void {
    groupIndex.clear();
    entryIndex.clear();
    parentGroupOf.clear();

    const walk = (group: ClientInitialState["tree"]): void => {
        groupIndex.set(group.id, group);

        for (const entry of group.entries) {
            entryIndex.set(entry.id, entry);
            parentGroupOf.set(entry.id, group.id);
        }

        for (const child of group.groups) {
            parentGroupOf.set(child.id, group.id);
            walk(child);
        }
    };

    walk(app.state.tree);

    syncSelectedGroupWithSelectedEntry();
}

export function setClientState(nextState: ClientInitialState): void {
    app.vaultLocked = false;
    app.state = nextState;

    if (nextState.settings) {
        app.settings = nextState.settings;
    }

    if (nextState.selectedEntryId !== undefined) {
        app.selectedEntryId = nextState.selectedEntryId;
    }

    reindex();

    if (!groupIndex.has(app.selectedGroupId)) {
        app.selectedGroupId = app.state.tree.id;
    }

    if (app.selectedEntryId && !entryIndex.has(app.selectedEntryId)) {
        app.selectedEntryId = null;
    }

    syncSelectedGroupWithSelectedEntry();
    resetCryptoUiState();
}

function syncSelectedGroupWithSelectedEntry(): void {
    if (!app.selectedEntryId) {
        return;
    }

    const parentGroupId = parentGroupOf.get(app.selectedEntryId);

    if (parentGroupId) {
        app.selectedGroupId = parentGroupId;
    }
}
