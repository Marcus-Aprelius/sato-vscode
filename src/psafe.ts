import type {
    EntryDetail,
    EntryFields,
    GroupView,
    VaultStats
} from "./vault";

const PasswordSafe = require("password-safe");

export interface PsafeEntry {
    id: string;
    groupPath: string;
    title: string;
    username: string;
    password: string;
    url: string;
    notes: string;
}

export interface PsafeVault {
    tree: GroupView;
    stats: VaultStats;
    entries: Map<string, PsafeEntry>;
    password: string;
    headerRecord: unknown;
    databaseRecords: unknown[];
    emptyGroups: Set<string>;
}

export async function openPsafeVault(
    bytes: Uint8Array,
    password: string
): Promise<PsafeVault> {
    return new Promise((resolve, reject) => {
        const safe = new PasswordSafe({ password });

        safe.load(Buffer.from(bytes), (err: unknown, header: unknown, records: unknown[]) => {
            if (err) {
                reject(err);
                return;
            }

            const entries = new Map<string, PsafeEntry>();

            for (let i = 0; i < records.length; i++) {
                const record = records[i];

                const entry: PsafeEntry = {
                    id: "psafe-" + i,
                    groupPath: readRecordField(record, ["getGroup", "getGroupName"], ""),
                    title: readRecordField(record, ["getTitle", "getName"], "Entry " + (i + 1)),
                    username: readRecordField(record, ["getUsername", "getUserName"], ""),
                    password: readRecordField(record, ["getPassword"], ""),
                    url: readRecordField(record, ["getUrl", "getURL"], ""),
                    notes: readRecordField(record, ["getNotes", "getNote", "getDescription"], "")
                };

                entries.set(entry.id, entry);
            }

            const emptyGroups = readHeaderEmptyGroups(header);
            const tree = buildPsafeTree(entries, emptyGroups);
            const stats = computePsafeStats(tree);

            resolve({
                tree,
                stats,
                entries,
                password,
                headerRecord: header,
                databaseRecords: records,
                emptyGroups
            });
        });
    });
}

export function readPsafeField(
    vault: PsafeVault,
    entryId: string,
    field: string
): string | undefined {
    const entry = vault.entries.get(entryId);

    if (!entry) {
        return undefined;
    }

    switch (field) {
        case "Title":
            return entry.title;
        case "UserName":
            return entry.username;
        case "Password":
            return entry.password;
        case "URL":
            return entry.url;
        case "Notes":
            return entry.notes;
        default:
            return undefined;
    }
}

export function readPsafeEntryDetail(
    vault: PsafeVault,
    entryId: string
): EntryDetail | undefined {
    const entry = vault.entries.get(entryId);

    if (!entry) {
        return undefined;
    }

    return {
        id: entry.id,
        groupId: entry.groupPath || "root",
        title: entry.title,
        username: entry.username,
        password: entry.password,
        url: entry.url,
        notes: entry.notes
    };
}

export function createPsafeEntry(
    vault: PsafeVault,
    groupId: string,
    fields: EntryFields
): void {
    const safe = new PasswordSafe({ password: vault.password });
    const title = fields.title.trim() || "(untitled)";
    const password = fields.password || "";
    const record = safe.createDatabaseRecord(title, password);

    callRecordSetter(record, "setTitle", title);
    callRecordSetter(record, "setPassword", password);
    callRecordSetter(record, "setUsername", fields.username || "");
    callRecordSetter(record, "setUrl", fields.url || "");

    const groupPath = groupIdToPsafeGroupPath(groupId);

    if (groupPath) {
        callRecordSetter(record, "setGroup", groupPath);
    }

    vault.databaseRecords.push(record);

    rebuildPsafeVault(vault);
}

export function updatePsafeEntry(
    vault: PsafeVault,
    entryId: string,
    fields: EntryFields
): void {
    const index = psafeEntryIdToIndex(entryId);

    if (index < 0 || index >= vault.databaseRecords.length) {
        return;
    }

    const record = vault.databaseRecords[index];
    const title = fields.title.trim() || "(untitled)";
    const password = fields.password || "";

    callRecordSetter(record, "setTitle", title);
    callRecordSetter(record, "setPassword", password);
    callRecordSetter(record, "setUsername", fields.username || "");
    callRecordSetter(record, "setUrl", fields.url || "");

    rebuildPsafeVault(vault);
}

export function deletePsafeEntry(
    vault: PsafeVault,
    entryId: string
): void {
    const index = psafeEntryIdToIndex(entryId);

    if (index < 0 || index >= vault.databaseRecords.length) {
        return;
    }

    vault.databaseRecords.splice(index, 1);

    rebuildPsafeVault(vault);
}

export function duplicatePsafeEntry(
    vault: PsafeVault,
    entryId: string
): void {
    const index = psafeEntryIdToIndex(entryId);

    if (index < 0 || index >= vault.databaseRecords.length) {
        return;
    }

    const source = vault.databaseRecords[index];

    const title = readRecordField(source, ["getTitle", "getName"], "(untitled)");
    const username = readRecordField(source, ["getUsername", "getUserName"], "");
    const password = readRecordField(source, ["getPassword"], "");
    const url = readRecordField(source, ["getUrl", "getURL"], "");
    const group = readRecordField(source, ["getGroup", "getGroupName"], "");

    const safe = new PasswordSafe({ password: vault.password });
    const copyTitle = `${title} (copy)`;
    const copy = safe.createDatabaseRecord(copyTitle, password);

    callRecordSetter(copy, "setTitle", copyTitle);
    callRecordSetter(copy, "setPassword", password);
    callRecordSetter(copy, "setUsername", username);
    callRecordSetter(copy, "setUrl", url);

    if (group) {
        callRecordSetter(copy, "setGroup", group);
    }

    vault.databaseRecords.push(copy);

    rebuildPsafeVault(vault);
}

export function createPsafeGroup(
    vault: PsafeVault,
    parentId: string,
    name: string
): void {
    const cleanName = name.trim();

    if (!cleanName) {
        return;
    }

    const parentPath = groupIdToPsafeGroupPath(parentId);
    const groupPath = parentPath ? `${parentPath}.${cleanName}` : cleanName;

    vault.emptyGroups.add(groupPath);

    rebuildPsafeVault(vault);
}

export function renamePsafeGroup(
    vault: PsafeVault,
    groupId: string,
    newName: string
): void {
    const oldPath = groupIdToPsafeGroupPath(groupId);
    const cleanName = newName.trim();

    if (!oldPath || !cleanName) {
        return;
    }

    const parts = oldPath.split(".");
    parts[parts.length - 1] = cleanName;

    const newPath = parts.join(".");
    const nextEmptyGroups = new Set<string>();

    for (const emptyGroupPath of vault.emptyGroups.values()) {
        if (emptyGroupPath === oldPath) {
            nextEmptyGroups.add(newPath);
            continue;
        }

        if (emptyGroupPath.startsWith(oldPath + ".")) {
            nextEmptyGroups.add(newPath + emptyGroupPath.slice(oldPath.length));
            continue;
        }

        nextEmptyGroups.add(emptyGroupPath);
    }

    vault.emptyGroups = nextEmptyGroups;

    for (const record of vault.databaseRecords) {
        const group = readRecordField(record, ["getGroup", "getGroupName"], "");

        if (group === oldPath) {
            callRecordSetter(record, "setGroup", newPath);
            continue;
        }

        if (group.startsWith(oldPath + ".")) {
            callRecordSetter(
                record,
                "setGroup",
                newPath + group.slice(oldPath.length)
            );
        }
    }

    rebuildPsafeVault(vault);
}

export function deletePsafeGroup(
    vault: PsafeVault,
    groupId: string
): void {
    const groupPath = groupIdToPsafeGroupPath(groupId);

    if (!groupPath) {
        return;
    }

    vault.databaseRecords = vault.databaseRecords.filter((record) => {
        const group = readRecordField(record, ["getGroup", "getGroupName"], "");

        return group !== groupPath && !group.startsWith(groupPath + ".");
    });

    const nextEmptyGroups = new Set<string>();

    for (const emptyGroupPath of vault.emptyGroups.values()) {
        if (emptyGroupPath === groupPath) {
            continue;
        }

        if (emptyGroupPath.startsWith(groupPath + ".")) {
            continue;
        }

        nextEmptyGroups.add(emptyGroupPath);
    }

    vault.emptyGroups = nextEmptyGroups;

    rebuildPsafeVault(vault);
}

export function savePsafeVaultToBytes(vault: PsafeVault): Uint8Array {
    const safe = new PasswordSafe({ password: vault.password });

    const encrypted = safe.store(
        vault.headerRecord,
        vault.databaseRecords
    );

    return encrypted instanceof Uint8Array
        ? encrypted
        : new Uint8Array(encrypted);
}

function rebuildPsafeVault(vault: PsafeVault): void {
    const entries = new Map<string, PsafeEntry>();

    for (let i = 0; i < vault.databaseRecords.length; i++) {
        const record = vault.databaseRecords[i];

        const entry: PsafeEntry = {
            id: "psafe-" + i,
            groupPath: readRecordField(record, ["getGroup", "getGroupName"], ""),
            title: readRecordField(record, ["getTitle", "getName"], "Entry " + (i + 1)),
            username: readRecordField(record, ["getUsername", "getUserName"], ""),
            password: readRecordField(record, ["getPassword"], ""),
            url: readRecordField(record, ["getUrl", "getURL"], ""),
            notes: readRecordField(record, ["getNotes", "getNote", "getDescription"], "")
        };

        entries.set(entry.id, entry);
    }

    const tree = buildPsafeTree(entries, vault.emptyGroups);
    const stats = computePsafeStats(tree);

    vault.entries = entries;
    vault.tree = tree;
    vault.stats = stats;
}

function readRecordField(
    record: unknown,
    methodNames: string[],
    fallback: string
): string {
    const obj = record as Record<string, unknown>;

    for (const methodName of methodNames) {
        const method = obj[methodName];

        if (typeof method === "function") {
            try {
                const value = method.call(record);

                if (value !== undefined && value !== null) {
                    return String(value);
                }
            } catch {
                // ignore and try next method
            }
        }
    }

    return fallback;
}

function buildPsafeTree(entries: Map<string, PsafeEntry>, emptyGroups = new Set<string>()): GroupView {
    const root: GroupView = {
        id: "root",
        parentId: null,
        name: "Password Safe",
        groups: [],
        entries: []
    };

    const groupMap = new Map<string, GroupView>();
    groupMap.set("", root);

    for (const path of emptyGroups.values()) {
        ensureGroup(root, groupMap, path);
    }

    for (const entry of entries.values()) {
        const normalizedPath = entry.groupPath.trim();
        const group = ensureGroup(root, groupMap, normalizedPath);

        group.entries.push({
            id: entry.id,
            parentId: group.id,
            title: entry.title || "(untitled)",
            username: entry.username,
            url: entry.url,
            notes: entry.notes,
            fields: ["Title", "UserName", "Password", "URL", "Notes"],
            hasPassword: entry.password.length > 0,
            passwordLength: entry.password.length,
            weak: isWeakPassword(entry.password),
            expired: false
        });
    }

    return root;
}

function ensureGroup(
    root: GroupView,
    groupMap: Map<string, GroupView>,
    path: string
): GroupView {
    if (!path) {
        return root;
    }

    const parts = path.split(".").filter(Boolean);
    let currentPath = "";
    let parent = root;

    for (const part of parts) {
        currentPath = currentPath ? currentPath + "." + part : part;

        let group = groupMap.get(currentPath);

        if (!group) {
            group = {
                id: "group-" + currentPath,
                parentId: parent.id,
                name: part,
                groups: [],
                entries: []
            };

            parent.groups.push(group);
            groupMap.set(currentPath, group);
        }

        parent = group;
    }

    return parent;
}

function computePsafeStats(root: GroupView): VaultStats {
    const stats: VaultStats = {
        groups: 0,
        entries: 0,
        duplicates: 0,
        expired: 0,
        emptyGroups: 0,
        weak: 0
    };

    const passwordCounts = new Map<string, number>();

    const walk = (group: GroupView): void => {
        stats.groups++;

        if (group.groups.length === 0 && group.entries.length === 0) {
            stats.emptyGroups++;
        }

        for (const entry of group.entries) {
            stats.entries++;

            if (entry.weak) {
                stats.weak++;
            }

            if (entry.hasPassword) {
                const key = entry.passwordLength + ":" + entry.title;

                passwordCounts.set(
                    key,
                    (passwordCounts.get(key) ?? 0) + 1
                );
            }
        }

        for (const child of group.groups) {
            walk(child);
        }
    };

    walk(root);

    for (const count of passwordCounts.values()) {
        if (count > 1) {
            stats.duplicates += count;
        }
    }

    return stats;
}

function isWeakPassword(password: string): boolean {
    if (!password) {
        return false;
    }

    if (password.length < 10) {
        return true;
    }

    let classes = 0;

    if (/[a-z]/.test(password)) classes++;
    if (/[A-Z]/.test(password)) classes++;
    if (/[0-9]/.test(password)) classes++;
    if (/[^A-Za-z0-9]/.test(password)) classes++;

    return classes < 3;
}

function groupIdToPsafeGroupPath(groupId: string): string {
    if (!groupId || groupId === "root") {
        return "";
    }

    if (groupId.startsWith("group-")) {
        return groupId.slice("group-".length);
    }

    return "";
}

function psafeEntryIdToIndex(entryId: string): number {
    if (!entryId.startsWith("psafe-")) {
        return -1;
    }

    const raw = entryId.slice("psafe-".length);
    const index = Number.parseInt(raw, 10);

    return Number.isFinite(index) ? index : -1;
}

function callRecordSetter(
    record: unknown,
    methodName: string,
    value: string
): void {
    const obj = record as Record<string, unknown>;
    const method = obj[methodName];

    if (typeof method === "function") {
        method.call(record, value);
    }
}

function readHeaderEmptyGroups(header: unknown): Set<string> {
    const result = new Set<string>();
    const obj = header as Record<string, unknown>;
    const method = obj.getEmptyGroups;

    if (typeof method !== "function") {
        return result;
    }

    try {
        const value = method.call(header);

        if (Array.isArray(value)) {
            for (const item of value) {
                const text = String(item).trim();

                if (text) {
                    result.add(text);
                }
            }

            return result;
        }

        if (typeof value === "string") {
            for (const item of value.split(/\r?\n|,/)) {
                const text = item.trim();

                if (text) {
                    result.add(text);
                }
            }

            return result;
        }

        const iterable = value as {
            [Symbol.iterator]?: unknown;
        };

        if (value && typeof value === "object" && typeof iterable[Symbol.iterator] === "function") {
            for (const item of value as Iterable<unknown>) {
                const text = String(item).trim();

                if (text) {
                    result.add(text);
                }
            }
        }
    } catch {
        // ignore
    }

    return result;
}
