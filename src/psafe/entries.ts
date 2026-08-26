import type { EntryDetail, EntryFields } from "../vault";

import type { PsafeVault } from "./types";

import {
    callRecordSetter,
    groupIdToPsafeGroupPath,
    psafeEntryIdToIndex,
    readRecordField
} from "./records";

import { rebuildPsafeVault } from "./tree";

const PasswordSafe = require("password-safe");

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
    const safe = new PasswordSafe({password: vault.password});
    const title = fields.title.trim() || "(untitled)";
    const password = fields.password || "";
    const record = safe.createDatabaseRecord(title, password );

    callRecordSetter(record, "setTitle", title);
    callRecordSetter(record, "setPassword", password);
    callRecordSetter(record, "setUsername", fields.username || "");
    callRecordSetter(record, "setUrl", fields.url || "");
    callRecordSetter(record, "setNotes", fields.notes || "");

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
    callRecordSetter(record, "setNotes", fields.notes || "");

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
    const password = readRecordField(source, ["getPassword"], "" );
    const url = readRecordField(source, ["getUrl", "getURL"], "");
    const notes = readRecordField(source, ["getNotes", "getNote", "getDescription"], "");
    const group = readRecordField(source, ["getGroup", "getGroupName"], "");
    const safe = new PasswordSafe({password: vault.password});
    const copyTitle = `${title} (copy)`;
    const copy = safe.createDatabaseRecord(copyTitle, password);

    callRecordSetter(copy, "setTitle", copyTitle);
    callRecordSetter(copy, "setPassword", password);
    callRecordSetter(copy, "setUsername", username);
    callRecordSetter(copy, "setUrl", url);
    callRecordSetter(copy, "setNotes", notes);

    if (group) {
        callRecordSetter(copy, "setGroup", group);
    }

    vault.databaseRecords.push(copy);

    rebuildPsafeVault(vault);
}
