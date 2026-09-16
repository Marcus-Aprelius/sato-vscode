import { byId } from "./dom";

import type { EntryView } from "../../vault";

import {
    app,
    entryIndex,
    isCryptoFileView,
    isReadOnlyVault,
    vaultFormat
} from "./state";

export function renderStatus(): void {
    const bar = byId<HTMLElement>("statusbar");

    bar.innerHTML = "";

    if (app.settings && app.settings.showStatusBar === false) {
        bar.style.display = "none";
        return;
    }

    bar.style.display = "";

    const item = (
        label: string,
        value: string | number,
        className = "",
        suffix = "",
        suffixClassName = ""
    ): void => {
        const element = document.createElement("span");
        element.className = "item";

        const labelElement = document.createElement("strong");
        labelElement.className = "status-label";
        labelElement.textContent = label + ":";

        const valueElement = document.createElement("span");
        valueElement.className = "status-value";
        valueElement.textContent = String(value);

        element.appendChild(labelElement);
        element.appendChild(valueElement);

        if (suffix) {
            const suffixElement = document.createElement("strong");

            suffixElement.className = "validity-days" + (suffixClassName ? " " + suffixClassName : "");
            suffixElement.textContent = suffix;
            element.appendChild(suffixElement);
        }

        bar.appendChild(element);
    };

    if (isCryptoFileView()) {
        renderCryptoStatus(item);
        return;
    }

    const stats = app.state.stats;

    if (isReadOnlyVault()) {
        item("Format", formatVaultName(vaultFormat()));
        item("Mode", "read-only");
        item("Groups", stats.groups);
        item("Entries", stats.entries);
        item("Duplicates", stats.duplicates, stats.duplicates > 0 ? "warn" : "");
        item("Weak", stats.weak, stats.weak > 0 ? "warn" : "");

        return;
    }

    item("Groups", stats.groups);
    item("Entries", stats.entries);
    item("Duplicates", stats.duplicates, stats.duplicates > 0 ? "warn" : "");
    item("Weak", stats.weak, stats.weak > 0 ? "warn" : "");
    item("Expired", stats.expired, stats.expired > 0 ? "err" : "");
    item("Empty groups", stats.emptyGroups );
}

function renderCryptoStatus(
    item: (
        label: string,
        value: string | number,
        className?: string,
        suffix?: string,
        suffixClassName?: string
    ) => void
): void {
    const entry = app.selectedEntryId ? entryIndex.get(app.selectedEntryId) : undefined;
    const values = entry?.values || {};

    item("Type", values.Type || "Crypto file");

    if (values.Status) {
        item("Status", values.Status, statusClass(values.Status));
    }

    if (values.Algorithm) {
        item("Algorithm", values.Algorithm);
    }

    if (values["Key size"]) {
        item("Key size", values["Key size"]);
    }

    if (values["Key Size"]) {
        item("Key size", values["Key Size"]);
    }

    if (values.Curve) {
        item("Curve", values.Curve);
    }

    if (values["Valid to"]) {
        const validity = formatCertificateValidity( values["Valid to"]);

        const validityClass = validity.expired ? "err" : validity.days <= 30 ? "warn" : "success";

        item("Valid to", validity.date, "", validity.message, validityClass);
    }

    if (values["Public key algorithm"]) {
        item("Public key", values["Public key algorithm"]);
    }

    if (values["Public Key Algorithm"]) {
        item("Public key", values["Public Key Algorithm"]);
    }

    if (entry) {
        item("Empty values", countEmptyValues(entry));
    }
}

function countEmptyValues(
    entry: EntryView
): number {
    
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

function statusClass(
    status: string
): string {
    const normalized = status.toLowerCase();

    if (normalized.includes("failed") || normalized.includes("error")) {
        return "err";
    }

    if (normalized === "locked" || normalized === "encrypted") {
        return "warn";
    }

    return "";
}

function formatVaultName(
    format: string
): string {
    switch (format) {
        case "1pif": return "1PIF";
        case "bcup": return "Buttercup";
        case "opvault": return "OPVault";
        case "agilekeychain": return "Agile Keychain";
        case "kdb": return "KeePass 1.x";
        default: return format || "Imported vault";
    }
}

function formatCertificateValidity(
    value: string
): {
    date: string;
    message: string;
    expired: boolean;
    days: number;
} {
    const expirationTime = Date.parse(value);

    if (Number.isNaN(expirationTime)) {
        return {
            date: value,
            message: "",
            expired: false,
            days: Number.POSITIVE_INFINITY
        };
    }

    const difference = expirationTime - Date.now();
    const dayMilliseconds = 24 * 60 * 60 * 1000;

    if (difference < 0) {
        const daysAgo = Math.max(1, Math.floor(Math.abs(difference) / dayMilliseconds));

        return {
            date: value,
            message: daysAgo === 1 ? "(1 day ago)" : `(${daysAgo} days ago)`,
            expired: true,
            days: daysAgo
        };
    }

    const daysLeft = Math.ceil(difference / dayMilliseconds);

    return {
        date: value,
        message: daysLeft === 0 ? "(expires today)" : daysLeft === 1 ? "(1 day left)" : `(${daysLeft} days left)`,
        expired: false,
        days: daysLeft
    };
}
