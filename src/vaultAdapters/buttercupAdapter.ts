import * as vscode from "vscode";
import type { GroupView } from "../vault";

import {
    buildImportedVaultStats,
    createImportedEntryView,
    fileNameWithoutExtension as fileNameWithoutExt,
    scalarString as safeString,
    sortGroupViewContents as sortGroups,
    takeKnownField as takeProperty,
    uniqueFieldName,
    type ImportedVault,
    type ImportedVaultEntry
} from "../importedVault";

interface ButtercupEntry {
    id: string;
    getProperty(name?: string): unknown;
    getAttribute?(name?: string): unknown;
}

interface ButtercupGroup {
    id: string;
    getTitle(): string;
    getGroups(): ButtercupGroup[];
    getEntries(): ButtercupEntry[];
}

interface ButtercupVault {
    getGroups(): ButtercupGroup[];
}

interface ButtercupCredentials {
}

interface ButtercupLoadedData {
    Format: new (
        history: unknown
    ) => unknown;

    history: unknown;
}

interface ButtercupModule {
    init?: () => Promise<void> | void;

    Credentials: {
        fromDatasource(
            datasourceConfig: {
                content: string;
            },
            masterPassword?: string
        ): ButtercupCredentials;

        fromPassword(
            password: string
        ): ButtercupCredentials;
    };

    TextDatasource: new (
        credentials: ButtercupCredentials
    ) => {
        setContent(
            content: string
        ): void;

        load(
            credentials: ButtercupCredentials
        ): Promise<ButtercupLoadedData>;
    };

    Vault: {
        createFromHistory(
            history: unknown,
            format?: ButtercupLoadedData["Format"]
        ): ButtercupVault;
    };
}

export async function openButtercupVault(
    uri: vscode.Uri,
    password: string
): Promise<ImportedVault> {
    const Buttercup = await import(
        "buttercup"
    ) as unknown as ButtercupModule;

    if (typeof Buttercup.init === "function") {
        await Buttercup.init();
    }

    const bytes = await vscode.workspace.fs.readFile(uri);

    const content = Buffer.from(bytes).toString("utf8");

    if (!content.trim()) {
        throw new Error(
            "Buttercup vault is empty."
        );
    }

    const datasourceCredentials = Buttercup.Credentials.fromDatasource({content}, password);
    const datasource = new Buttercup.TextDatasource(datasourceCredentials);

    datasource.setContent(content);

    const vaultCredentials = Buttercup.Credentials.fromPassword(password);
    const loaded = await datasource.load(vaultCredentials);
    const vault = Buttercup.Vault.createFromHistory(loaded.history, loaded.Format);

    return mapButtercupVault(uri, vault);
}

function mapButtercupVault(
    uri: vscode.Uri,
    vault: ButtercupVault
): ImportedVault {
    const root: GroupView = {
        id: "bcup-root",
        parentId: null,
        name: fileNameWithoutExt(uri, "bcup", "Buttercup Vault"),
        groups: [],
        entries: []
    };

    const entries = new Map<string, ImportedVaultEntry>();
    const sourceGroups = vault.getGroups();

    for (let index = 0; index < sourceGroups.length; index++) {
        root.groups.push(
            mapButtercupGroup(
                sourceGroups[index],
                root.id,
                entries,
                `bcup-group-${index}`
            )
        );
    }

    sortGroups(root);

    return {
        format: "bcup",
        name: fileNameWithoutExt(uri, "bcup", "Buttercup Vault"),
        readOnly: true,
        tree: root,
        stats: buildImportedVaultStats(root, entries),
        entries
    };
}

function mapButtercupGroup(
    source: ButtercupGroup,
    parentId: string,
    entries: Map<string, ImportedVaultEntry>,
    fallbackId: string
): GroupView {
    const groupId = source.id || fallbackId;

    const group: GroupView = {
        id: groupId,
        parentId,
        name: safeString(source.getTitle()) || "(unnamed)",
        groups: [],
        entries: []
    };

    const sourceEntries = source.getEntries();

    for (
        let index = 0;
        index < sourceEntries.length;
        index++
    ) {
        const importedEntry = mapButtercupEntry(sourceEntries[index], groupId, index);
        entries.set(importedEntry.id, importedEntry);
        group.entries.push(createImportedEntryView(importedEntry));
    }

    const childGroups = source.getGroups();

    for (
        let index = 0;
        index < childGroups.length;
        index++
    ) {
        group.groups.push(mapButtercupGroup(childGroups[index], groupId, entries, `${groupId}-group-${index}`));
    }

    sortGroups(group);

    return group;
}

function mapButtercupEntry(
    source: ButtercupEntry,
    groupId: string,
    index: number
): ImportedVaultEntry {
    const properties = readStringRecord(source.getProperty());
    const attributes = typeof source.getAttribute === "function" ? readStringRecord(source.getAttribute()) : {};
    const title = takeProperty(properties, ["title", "name"]) || `Entry ${index + 1}`;
    const username = takeProperty( properties, ["username", "user", "login"]);
    const password = takeProperty(properties, ["password", "pass", "passwd"]);
    const url = takeProperty(properties, ["url", "website", "location"]);
    const notes = takeProperty(properties, ["notes", "note", "description"]);

    const fields: Record<string, string> = {...properties};

    for (
        const [name, value] of Object.entries(attributes)
    ) {
        fields[uniqueFieldName(fields, `Attribute: ${name}`)] = value;
    }

    return {
        id: source.id || `${groupId}-entry-${index}`,
        groupId,
        title,
        username,
        password,
        url,
        notes,
        fields
    };
}

function readStringRecord(
    value: unknown
): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    const output: Record<string, string> = {};

    for (const [name, fieldValue] of Object.entries(value as Record<string, unknown>)) {
        const text = safeString(fieldValue);

        if (text) {
            output[name] = text;
        }
    }

    return output;
}
