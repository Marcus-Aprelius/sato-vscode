import type { ClientEntry } from "../types";

const STANDARD_VAULT_FIELDS = [ "Title", "UserName", "URL", "Password", "Notes" ];

export function countCryptoEmptyValues(entry: ClientEntry): number {
    const fields = entry.fields || [];
    let count = 0;

    for (const field of fields) {
        const value = entry.values?.[field] || "";

        if (!value) {
            count++;
        }
    }

    return count;
}

export function countVaultEmptyValues(entry: ClientEntry): number {
    const fields = getVaultDetailFields(entry);

    let count = 0;

    for (const field of fields) {
        if (!getVaultFieldPreviewValue(entry, field)) {
            count++;
        }
    }

    return count;
}

export function getVaultDetailFields(entry: ClientEntry): string[] {
    const fields = entry.fields || [];

    return [
        "UserName",
        "URL",
        "Password",
        "Notes",
        ...fields.filter((field) =>
                !STANDARD_VAULT_FIELDS.includes(
                    field
                )
        )
    ];
}

export function getVaultFieldPreviewValue(
    entry: ClientEntry,
    field: string
): string {
    if (field === "Title") {
        return entry.title;
    }

    if (field === "UserName") {
        return entry.username;
    }

    if (field === "URL") {
        return entry.url;
    }

    if (field === "Password") {
        return entry.hasPassword ? "********" : "";
    }

    if (field === "Notes") {
        return entry.notes;
    }

    return entry.values?.[field] || "";
}

export function emptyValuesButtonText(
    visible: boolean,
    count: number
): string {
    if (count === 0) {
        return "Show Empty Values (0)";
    }

    return visible
        ? `Hide Empty Values (${count})`
        : `Show Empty Values (${count})`;
}

export function emptyValuesButtonTitle(
    visible: boolean,
    count: number
): string {
    if (count === 0) {
        return "No empty values";
    }

    return visible
        ? "Hide empty values"
        : "Show empty values";
}
