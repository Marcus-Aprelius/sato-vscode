import { readRecordField } from "./records";
import { isWeakPassword } from "../security/passwordStrength";

import type { GroupView, VaultStats } from "../vault";
import type { PsafeEntry, PsafeVault } from "./types";

export function rebuildPsafeVault(
    vault: PsafeVault
): void {
    const entries = new Map<string, PsafeEntry>();

    for (let index = 0; index < vault.databaseRecords.length; index++) {
        const record = vault.databaseRecords[index];
        const entry: PsafeEntry = {
            id: `psafe-${index}`,
            groupPath: readRecordField(record, ["getGroup", "getGroupName"], ""),
            title: readRecordField(record, ["getTitle", "getName"], `Entry ${index + 1}`),
            username: readRecordField(record, ["getUsername", "getUserName"], ""),
            password: readRecordField(record, ["getPassword"], ""),
            url: readRecordField(record, ["getUrl", "getURL"], ""),
            notes: readRecordField(record, ["getNotes", "getNote", "getDescription"], "")
        };

        entries.set(entry.id, entry);
    }

    const tree = buildPsafeTree(entries, vault.emptyGroups);

    vault.entries = entries;
    vault.tree = tree;
    vault.stats = computePsafeStats(tree, entries);
}

export function buildPsafeTree(
    entries: Map<string, PsafeEntry>,
    emptyGroups = new Set<string>()
): GroupView {
    const root: GroupView = {id: "root", parentId: null, name: "Password Safe", groups: [], entries: []};
    const groupMap = new Map<string, GroupView>();

    groupMap.set("", root);

    for (const groupPath of emptyGroups.values()) {
        ensureGroup(root, groupMap, groupPath);
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

export function computePsafeStats(
    root: GroupView,
    entries: Map<string, PsafeEntry>
): VaultStats {
    const stats: VaultStats = {groups: 0, entries: 0, duplicates: 0, expired: 0, emptyGroups: 0, weak: 0};
    const passwordCounts = new Map<string, number>();
    const walk = (group: GroupView): void => {
        stats.groups++;

        if (group.groups.length === 0 && group.entries.length === 0) {
            stats.emptyGroups++;
        }

        for (const entryView of group.entries) {
            stats.entries++;

            const entry = entries.get(entryView.id);
            const password = entry?.password || "";

            if (!password) {
                continue;
            }

            if (isWeakPassword(password)) {
                stats.weak++;
            }

            passwordCounts.set(password, (passwordCounts.get(password) ?? 0) + 1);
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

function ensureGroup(
    root: GroupView,
    groupMap: Map<string, GroupView>,
    groupPath: string
): GroupView {
    if (!groupPath) {
        return root;
    }

    const parts = groupPath.split(".").filter(Boolean);

    let currentPath = "";
    let parent = root;

    for (const part of parts) {
        currentPath = currentPath ? `${currentPath}.${part}` : part;

        let group = groupMap.get(currentPath);

        if (!group) {
            group = {id: `group-${currentPath}`, parentId: parent.id, name: part, groups: [], entries: []};
            parent.groups.push(group);
            groupMap.set(currentPath, group);
        }

        parent = group;
    }

    return parent;
}
