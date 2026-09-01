import type { GroupView, VaultStats } from "../vault";

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
