import type { PsafeVault } from "./types";
import { rebuildPsafeVault } from "./tree";

import {
    callRecordSetter,
    groupIdToPsafeGroupPath,
    readRecordField
} from "./records";


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
            callRecordSetter(record, "setGroup", newPath );

            continue;
        }

        if (group.startsWith(oldPath + ".")) {
            callRecordSetter(record, "setGroup", newPath + group.slice(oldPath.length));
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

    vault.databaseRecords =
        vault.databaseRecords.filter(
            (record) => {
                const group = readRecordField(record, ["getGroup", "getGroupName"], "");
                return (group !== groupPath && !group.startsWith(groupPath + "."));
            }
        );

    const nextEmptyGroups = new Set<string>();

    for (const emptyGroupPath of vault.emptyGroups.values()) {
        if (emptyGroupPath === groupPath || emptyGroupPath.startsWith(groupPath + ".")) {
            continue;
        }

        nextEmptyGroups.add(emptyGroupPath);
    }

    vault.emptyGroups = nextEmptyGroups;

    rebuildPsafeVault(vault);
}
