import type { GroupView, VaultStats } from "./vault";
import { isWeakPassword } from "./security/passwordStrength";

export type ImportedVaultFormat = 
    | "kdb"
    | "1pif"
    | "opvault"
    | "agilekeychain"
    | "bcup";

export interface ImportedVaultEntry {
    id: string;
    groupId: string;
    title: string;
    username: string;
    password: string;
    url: string;
    notes: string;
    fields: Record<string, string>;
}

export interface ImportedVault {
    format: ImportedVaultFormat;
    name: string;
    readOnly: true;
    tree: GroupView;
    stats: VaultStats;
    entries: Map<string, ImportedVaultEntry>;
}

export function readImportedVaultField(
    vault: ImportedVault,
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
            return entry.fields[field];
    }
}

export function buildImportedVaultStats(
    tree: GroupView,
    entries: Map<string, ImportedVaultEntry>
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

            passwordCounts.set(password, (passwordCounts.get(password) || 0) + 1);
        }

        for (const child of group.groups) {
            walk(child);
        }
    };

    walk(tree);

    for (const count of passwordCounts.values()) {
        if (count > 1) {
            stats.duplicates += count;
        }
    }

    return stats;
}

export function createImportedEntryView(
    entry: ImportedVaultEntry
): GroupView["entries"][number] {
    const customFields = Object.keys(entry.fields).filter(
        (field) => !["Title", "UserName", "Password", "URL", "Notes"].includes(field)
    );

    return {
        id: entry.id,
        parentId: entry.groupId,
        title: entry.title || "(untitled)",
        username: entry.username,
        url: entry.url,
        notes: entry.notes,
        fields: ["Title", "UserName", "Password", "URL", "Notes", ...customFields],
        hasPassword: entry.password.length > 0,
        passwordLength: entry.password.length,
        weak: isWeakPassword(entry.password),
        expired: false,
        values: {...entry.fields}
    };
}
