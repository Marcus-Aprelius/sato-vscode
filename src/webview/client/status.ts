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
        className = ""
    ): void => {
        const element =
            document.createElement("span");

        element.className =
            "item" +
            (
                className
                    ? " " + className
                    : ""
            );

        const labelElement =
            document.createElement("span");

        labelElement.textContent =
            label + ":";

        const valueElement =
            document.createElement("strong");

        valueElement.textContent =
            String(value);

        element.appendChild(labelElement);
        element.appendChild(valueElement);
        bar.appendChild(element);
    };

    if (isCryptoFileView()) {
        renderCryptoStatus(item);
        return;
    }

    const stats = app.state.stats;

    if (isReadOnlyVault()) {
        item(
            "Format",
            formatVaultName(
                vaultFormat()
            )
        );

        item(
            "Mode",
            "read-only"
        );

        item(
            "Groups",
            stats.groups
        );

        item(
            "Entries",
            stats.entries
        );

        item(
            "Duplicates",
            stats.duplicates,
            stats.duplicates > 0
                ? "warn"
                : ""
        );

        item(
            "Weak",
            stats.weak,
            stats.weak > 0
                ? "warn"
                : ""
        );

        return;
    }

    item(
        "Groups",
        stats.groups
    );

    item(
        "Entries",
        stats.entries
    );

    item(
        "Duplicates",
        stats.duplicates,
        stats.duplicates > 0
            ? "warn"
            : ""
    );

    item(
        "Weak",
        stats.weak,
        stats.weak > 0
            ? "warn"
            : ""
    );

    item(
        "Expired",
        stats.expired,
        stats.expired > 0
            ? "err"
            : ""
    );

    item(
        "Empty groups",
        stats.emptyGroups
    );
}

function renderCryptoStatus(
    item: (
        label: string,
        value: string | number,
        className?: string
    ) => void
): void {
    const entry = app.selectedEntryId
        ? entryIndex.get(
            app.selectedEntryId
        )
        : undefined;

    const values =
        entry?.values || {};

    item(
        "Type",
        values.Type || "Crypto file"
    );

    if (values.Status) {
        item(
            "Status",
            values.Status,
            statusClass(values.Status)
        );
    }

    if (values.Algorithm) {
        item(
            "Algorithm",
            values.Algorithm
        );
    }

    if (values["Key size"]) {
        item(
            "Key size",
            values["Key size"]
        );
    }

    if (values["Key Size"]) {
        item(
            "Key size",
            values["Key Size"]
        );
    }

    if (values.Curve) {
        item(
            "Curve",
            values.Curve
        );
    }

    if (values["Valid to"]) {
        const expired =
            app.state.stats.expired > 0;

        item(
            "Valid to",
            values["Valid to"],
            expired
                ? "err"
                : ""
        );
    }

    if (values["Public key algorithm"]) {
        item(
            "Public key",
            values["Public key algorithm"]
        );
    }

    if (values["Public Key Algorithm"]) {
        item(
            "Public key",
            values["Public Key Algorithm"]
        );
    }

    if (entry) {
        item(
            "Empty values",
            countEmptyValues(entry)
        );
    }

    if (entry?.hasPrivateKey) {
        item(
            "Private key",
            app.privateKeyVisible
                ? "shown"
                : "hidden",
            app.privateKeyVisible
                ? "warn"
                : ""
        );
    }
}

function countEmptyValues(
    entry: EntryView
): number {
    const fields =
        entry.fields || [];

    let count = 0;

    for (const field of fields) {
        const value =
            entry.values?.[field] || "";

        if (!value) {
            count++;
        }
    }

    return count;
}

function statusClass(
    status: string
): string {
    const normalized =
        status.toLowerCase();

    if (
        normalized.includes("failed") ||
        normalized.includes("error")
    ) {
        return "err";
    }

    if (
        normalized === "locked" ||
        normalized === "encrypted"
    ) {
        return "warn";
    }

    return "";
}

function formatVaultName(
    format: string
): string {
    switch (format) {
        case "1pif":
            return "1PIF";

        case "bcup":
            return "Buttercup";

        case "opvault":
            return "OPVault";

        case "agilekeychain":
            return "Agile Keychain";

        case "kdb":
            return "KeePass 1.x";

        default:
            return format || "Imported vault";
    }
}