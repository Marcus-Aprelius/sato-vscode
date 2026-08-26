import { buildPsafeTree, computePsafeStats } from "./tree";
import { readHeaderEmptyGroups, readRecordField } from "./records";

import type { PsafeEntry, PsafeVault } from "./types";

const PasswordSafe = require( "password-safe");

export async function openPsafeVault(
    bytes: Uint8Array,
    password: string
): Promise<PsafeVault> {
    return new Promise(
        (resolve, reject) => {
            const safe = new PasswordSafe({password});

            safe.load(
                Buffer.from(bytes),
                (error: unknown, header: unknown, records: unknown[]) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    const entries = createEntries(records);
                    const emptyGroups = readHeaderEmptyGroups(header);
                    const tree = buildPsafeTree(entries, emptyGroups);
                    const stats = computePsafeStats(tree, entries);

                    resolve({tree, stats, entries, password, headerRecord: header, databaseRecords: records, emptyGroups});
                }
            );
        }
    );
}

export function savePsafeVaultToBytes(
    vault: PsafeVault
): Uint8Array {
    const safe = new PasswordSafe({password: vault.password});
    const encrypted = safe.store(vault.headerRecord, vault.databaseRecords);

    return encrypted instanceof Uint8Array ? encrypted : new Uint8Array(encrypted);
}

function createEntries(
    records: unknown[]
): Map<string, PsafeEntry> {
    const entries = new Map<string, PsafeEntry>();

    for (let index = 0; index < records.length; index++) {
        const record = records[index];
        const entry: PsafeEntry = {
            id: `psafe-${index}`,
            groupPath: readRecordField(record, ["getGroup", "getGroupName"],""),
            title: readRecordField(record, ["getTitle", "getName"], `Entry ${index + 1}`),
            username: readRecordField(record, ["getUsername", "getUserName"], ""),
            password: readRecordField(record, ["getPassword"], ""),
            url: readRecordField(record, ["getUrl", "getURL"], ""),
            notes: readRecordField(record, ["getNotes", "getNote", "getDescription"], "")
        };

        entries.set(entry.id, entry);
    }

    return entries;
}
