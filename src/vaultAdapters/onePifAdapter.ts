import type * as vscode from "vscode";
import type { GroupView } from "../vault";

import {
    buildImportedVaultStats,
    createImportedEntryView,
    type ImportedVault,
    type ImportedVaultEntry
} from "../importedVault";

interface OnePifRecord {
    uuid?: unknown;
    title?: unknown;
    typeName?: unknown;
    location?: unknown;
    locationKey?: unknown;
    secureContents?: unknown;
    openContents?: unknown;
}

interface OnePifSecureContents {
    title?: unknown;
    username?: unknown;
    password?: unknown;
    notesPlain?: unknown;
    notes?: unknown;
    URL?: unknown;
    url?: unknown;
    fields?: unknown;
    sections?: unknown;
}

interface OnePifOpenContents {
    title?: unknown;
    username?: unknown;
    tags?: unknown;
    contentsHash?: unknown;
}

interface OnePifField {
    name?: unknown;
    value?: unknown;
    type?: unknown;
    designation?: unknown;
}

interface OnePifSection {
    title?: unknown;
    name?: unknown;
    fields?: unknown;
}

export async function openOnePifVault(
    uri: vscode.Uri,
    bytes: Uint8Array
): Promise<ImportedVault> {
    const text = Buffer.from(bytes).toString("utf8");
    const records = parseOnePifRecords(text);

    const root: GroupView = {
        id: "onepif-root",
        parentId: null,
        name: fileNameWithoutExtension(uri),
        groups: [],
        entries: []
    };

    const groups = new Map<string, GroupView>();
    const entries = new Map<string, ImportedVaultEntry>();

    groups.set("", root);

    for (let index = 0; index < records.length; index++) {
        const record = records[index];
        const entry = mapOnePifRecord(record, index);

        const groupName = normalizeGroupName(stringValue(record.typeName) || "Items");

        const group = ensureGroup(root, groups, groupName);

        entry.groupId = group.id;

        entries.set(entry.id, entry);
        group.entries.push(createImportedEntryView(entry));
    }

    sortImportedTree(root);

    return {
        format: "1pif",
        name: fileNameWithoutExtension(uri),
        readOnly: true,
        tree: root,
        stats: buildImportedVaultStats(root, entries),
        entries
    };
}

function parseOnePifRecords(text: string): OnePifRecord[] {
    const trimmed = text.replace(/^\uFEFF/, "").trim();

    if (!trimmed) {
        return [];
    }

    const parsedDocument = tryParseJson(trimmed);

    if (Array.isArray(parsedDocument)) {
        return parsedDocument.filter(isOnePifRecord);
    }

    if (isOnePifRecord(parsedDocument)) {
        return [parsedDocument];
    }

    const records: OnePifRecord[] = [];
    const lines = trimmed.split(/\r?\n/);

    for (const line of lines) {
        const value = line.trim();

        if (!value || value.startsWith("***") || value.startsWith("//") || value.startsWith("#")) {
            continue;
        }

        const parsed = tryParseJson(value);

        if (isOnePifRecord(parsed)) {
            records.push(parsed);
        }
    }

    return records;
}

function mapOnePifRecord(
    record: OnePifRecord,
    index: number
): ImportedVaultEntry {
    const secure = objectValue(record.secureContents) as OnePifSecureContents;
    const open = objectValue(record.openContents) as OnePifOpenContents;
    const customFields: Record<string, string> = {};

    collectOnePifFields(secure.fields, customFields);
    collectOnePifSections(secure.sections, customFields);

    const title =
        stringValue(record.title) ||
        stringValue(secure.title) ||
        stringValue(open.title) ||
        `Item ${index + 1}`;

    const username =
        stringValue(secure.username) ||
        stringValue(open.username) ||
        takeKnownField(customFields, ["username", "user", "login"]);

    const password =
        stringValue(secure.password) ||
        takeKnownField(customFields, ["password", "pass", "passwd"]);

    const url =
        stringValue(record.location) ||
        stringValue(secure.URL) ||
        stringValue(secure.url) ||
        takeKnownField(customFields, ["url", "website", "location"]);

    const notes = stringValue(secure.notesPlain) || stringValue(secure.notes);
    const tags = stringArray(open.tags);

    if (tags.length > 0) {
        customFields.Tags = tags.join(", ");
    }

    const typeName = stringValue(record.typeName);

    if (typeName) {
        customFields["Item type"] = typeName;
    }

    return {
        id: stringValue(record.uuid) || `onepif-entry-${index}`,
        groupId: "",
        title,
        username,
        password,
        url,
        notes,
        fields: customFields
    };
}

function collectOnePifFields(
    value: unknown,
    result: Record<string, string>,
    prefix = ""
): void {
    if (!Array.isArray(value)) {
        return;
    }

    for (let index = 0; index < value.length; index++) {
        const field = objectValue(value[index]) as OnePifField;
        const name = stringValue(field.name) || stringValue(field.designation) || `Field ${index + 1}`;
        const fieldValue = displayValue(field.value);

        if (!fieldValue) {
            continue;
        }

        const key = prefix ? `${prefix}: ${name}` : name;

        result[uniqueFieldName(result, key)] = fieldValue;
    }
}

function collectOnePifSections(
    value: unknown,
    result: Record<string, string>
): void {
    if (!Array.isArray(value)) {
        return;
    }

    for (let index = 0; index < value.length; index++) {
        const section = objectValue(value[index]) as OnePifSection;
        const sectionName = stringValue(section.title) || stringValue(section.name) || `Section ${index + 1}`;

        collectOnePifFields(section.fields, result, sectionName);
    }
}

function ensureGroup(
    root: GroupView,
    groups: Map<string, GroupView>,
    name: string
): GroupView {
    const existing = groups.get(name);

    if (existing) {
        return existing;
    }

    const group: GroupView = {
        id: `onepif-group-${slug(name)}`,
        parentId: root.id,
        name,
        groups: [],
        entries: []
    };

    root.groups.push(group);
    groups.set(name, group);

    return group;
}

function sortImportedTree(root: GroupView): void {
    root.groups.sort((left, right) => left.name.localeCompare(right.name, undefined, {sensitivity: "base"}));

    for (const group of root.groups) {
        group.entries.sort((left, right) => left.title.localeCompare(right.title, undefined, {sensitivity: "base"}));
    }
}

function takeKnownField(
    fields: Record<string, string>,
    names: string[]
): string {
    for (const [key, value] of Object.entries(fields)) {
        const normalizedKey = key.trim().toLowerCase();

        if (!names.includes(normalizedKey)) {
            continue;
        }

        delete fields[key];

        return value;
    }

    return "";
}

function uniqueFieldName(
    fields: Record<string, string>,
    requestedName: string
): string {
    if (!(requestedName in fields)) {
        return requestedName;
    }

    let index = 2;

    while (`${requestedName} ${index}` in fields) {
        index++;
    }

    return `${requestedName} ${index}`;
}

function normalizeGroupName(value: string): string {
    return value
        .replace(/^webforms?\./i, "")
        .replace(/^wallet\./i, "")
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase())
        .trim() || "Items";
}

function fileNameWithoutExtension(
    uri: vscode.Uri
): string {
    const fileName = uri.path.split("/").pop() || "1Password Export";

    return fileName.replace(/\.1pif$/i, "");
}

function slug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
        "items";
}

function tryParseJson(value: string): unknown {
    try {
        return JSON.parse(value);

    } catch {
        return undefined;
    }
}

function isOnePifRecord(
    value: unknown
): value is OnePifRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const record = value as OnePifRecord;

    return !!(
        record.uuid ||
        record.title ||
        record.typeName ||
        record.secureContents ||
        record.openContents
    );
}

function objectValue(
    value: unknown
): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }

    return {};
}

function stringValue(value: unknown): string {
    if (value === undefined || value === null) {
        return "";
    }

    if (typeof value === "string") {
        return value.trim();
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return "";
}

function stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map(stringValue).filter(Boolean);
}

function displayValue(value: unknown): string {
    if (value === undefined || value === null) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    try {
        return JSON.stringify(value);

    } catch {
        return "";
    }
}
