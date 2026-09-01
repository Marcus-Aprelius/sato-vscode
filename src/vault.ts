import * as kdbxweb from "kdbxweb";
import { isWeakPassword } from "./security/passwordStrength";

export interface EntryView {
    id: string;
    parentId: string;
    title: string;
    username: string;
    url: string;
    notes: string;
    fields: string[];
    hasPassword: boolean;
    passwordLength: number;
    weak: boolean;
    expired: boolean;
    values?: Record<string, string>;
    readOnly?: boolean;
    hasPrivateKey?: boolean;
}

export interface GroupView {
    id: string;
    parentId: string | null;
    name: string;
    groups: GroupView[];
    entries: EntryView[];
}

export interface VaultStats {
    groups: number;
    entries: number;
    duplicates: number;
    expired: number;
    emptyGroups: number;
    weak: number;
}

export interface EntryDetail {
    id: string;
    groupId: string;
    title: string;
    username: string;
    password: string;
    url: string;
    notes: string;
}

export interface EntryFields {
    title: string;
    username: string;
    password: string;
    url: string;
    notes: string;
}

const STANDARD_FIELDS = new Set(["Title", "UserName", "Password", "URL", "Notes"]);

export function buildTree(db: kdbxweb.Kdbx): GroupView {
    return mapGroup(db.getDefaultGroup(), null);
}

function mapGroup(group: kdbxweb.KdbxGroup, parentId: string | null): GroupView {
    const id = group.uuid.id;
    return {
        id,
        parentId,
        name: group.name ?? "(unnamed)",
        groups: group.groups.map((g) => mapGroup(g, id)),
        entries: group.entries.map((e) => mapEntry(e, id))
    };
}

function mapEntry(entry: kdbxweb.KdbxEntry, parentId: string): EntryView {
    const password = readProtected(entry, "Password");
    const passwordLength = password.length;
    return {
        id: entry.uuid.id,
        parentId,
        title: readPlain(entry, "Title") || "(untitled)",
        username: readPlain(entry, "UserName"),
        url: readPlain(entry, "URL"),
        notes: readPlain(entry, "Notes"),
        fields: [...entry.fields.keys()],
        hasPassword: passwordLength > 0,
        passwordLength,
        weak: passwordLength > 0 && isWeakPassword(password),
        expired: isExpired(entry)
    };
}

function readPlain(entry: kdbxweb.KdbxEntry, field: string): string {
    const raw = entry.fields.get(field);
    if (raw === undefined) {
        return "";
    }
    if (typeof raw === "string") {
        return raw;
    }
    if (raw instanceof kdbxweb.ProtectedValue) {
        return raw.getText();
    }
    return String(raw);
}

function readProtected(entry: kdbxweb.KdbxEntry, field: string): string {
    return readPlain(entry, field);
}

function isExpired(entry: kdbxweb.KdbxEntry): boolean {
    const times = entry.times;
    if (!times || !times.expires) {
        return false;
    }
    const expiry = times.expiryTime;
    if (!expiry) {
        return false;
    }
    return expiry.getTime() <= Date.now();
}

export function computeStats(db: kdbxweb.Kdbx): VaultStats {
    const stats: VaultStats = {
        groups: 0,
        entries: 0,
        duplicates: 0,
        expired: 0,
        emptyGroups: 0,
        weak: 0
    };
    const passwordCounts = new Map<string, number>();

    const walk = (group: kdbxweb.KdbxGroup): void => {
        stats.groups++;
        if (group.groups.length === 0 && group.entries.length === 0) {
            stats.emptyGroups++;
        }
        for (const entry of group.entries) {
            stats.entries++;
            if (isExpired(entry)) {
                stats.expired++;
            }
            const password = readProtected(entry, "Password");
            if (password.length > 0) {
                if (isWeakPassword(password)) {
                    stats.weak++;
                }
                passwordCounts.set(password, (passwordCounts.get(password) ?? 0) + 1);
            }
        }
        for (const child of group.groups) {
            walk(child);
        }
    };
    walk(db.getDefaultGroup());

    for (const count of passwordCounts.values()) {
        if (count > 1) {
            stats.duplicates += count;
        }
    }
    return stats;
}

export function findGroup(db: kdbxweb.Kdbx, groupId: string): kdbxweb.KdbxGroup | undefined {
    return findGroupIn(db.getDefaultGroup(), groupId);
}

function findGroupIn(group: kdbxweb.KdbxGroup, groupId: string): kdbxweb.KdbxGroup | undefined {
    if (group.uuid.id === groupId) {
        return group;
    }
    for (const child of group.groups) {
        const found = findGroupIn(child, groupId);
        if (found) {
            return found;
        }
    }
    return undefined;
}

export function findEntry(db: kdbxweb.Kdbx, entryId: string): { entry: kdbxweb.KdbxEntry; parent: kdbxweb.KdbxGroup } | undefined {
    return findEntryIn(db.getDefaultGroup(), entryId);
}

function findEntryIn(
    group: kdbxweb.KdbxGroup,
    entryId: string
): { entry: kdbxweb.KdbxEntry; parent: kdbxweb.KdbxGroup } | undefined {
    for (const entry of group.entries) {
        if (entry.uuid.id === entryId) {
            return { entry, parent: group };
        }
    }
    for (const child of group.groups) {
        const found = findEntryIn(child, entryId);
        if (found) {
            return found;
        }
    }
    return undefined;
}

export function readEntryDetail(db: kdbxweb.Kdbx, entryId: string): EntryDetail | undefined {
    const found = findEntry(db, entryId);
    if (!found) {
        return undefined;
    }
    const { entry, parent } = found;
    return {
        id: entry.uuid.id,
        groupId: parent.uuid.id,
        title: readPlain(entry, "Title"),
        username: readPlain(entry, "UserName"),
        password: readProtected(entry, "Password"),
        url: readPlain(entry, "URL"),
        notes: readPlain(entry, "Notes")
    };
}

export function readEntryField(db: kdbxweb.Kdbx, entryId: string, field: string): string | undefined {
    const found = findEntry(db, entryId);
    if (!found) {
        return undefined;
    }
    const raw = found.entry.fields.get(field);
    if (raw === undefined) {
        return undefined;
    }
    if (typeof raw === "string") {
        return raw;
    }
    if (raw instanceof kdbxweb.ProtectedValue) {
        return raw.getText();
    }
    return String(raw);
}

export function applyEntryFields(entry: kdbxweb.KdbxEntry, fields: EntryFields): void {
    entry.fields.set("Title", fields.title);
    entry.fields.set("UserName", fields.username);
    entry.fields.set("Password", kdbxweb.ProtectedValue.fromString(fields.password));
    entry.fields.set("URL", fields.url);
    entry.fields.set("Notes", fields.notes);
    entry.times.update();
}

export function duplicateEntry(db: kdbxweb.Kdbx, entryId: string): kdbxweb.KdbxEntry | undefined {
    const found = findEntry(db, entryId);
    if (!found) {
        return undefined;
    }
    const { entry, parent } = found;
    const copy = db.createEntry(parent);
    for (const [key, value] of entry.fields) {
        if (value instanceof kdbxweb.ProtectedValue) {
            copy.fields.set(key, kdbxweb.ProtectedValue.fromString(value.getText()));
        } else if (typeof value === "string") {
            copy.fields.set(key, value);
        }
    }
    const originalTitle = readPlain(entry, "Title");
    copy.fields.set("Title", originalTitle ? `${originalTitle} (copy)` : "(copy)");
    copy.icon = entry.icon;
    copy.times.update();
    return copy;
}

export function isStandardField(name: string): boolean {
    return STANDARD_FIELDS.has(name);
}
