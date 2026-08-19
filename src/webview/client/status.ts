import { byId } from "./dom";
import type { EntryView } from "../../vault";
import { app, entryIndex, isCryptoFileView } from "./state";

export function renderStatus(): void {
    const bar = byId<HTMLElement>("statusbar");

    bar.innerHTML = "";

    if (app.settings && app.settings.showStatusBar === false) {
        bar.style.display = "none";
        return;
    }

    bar.style.display = "";

    const item = (label: string, value: string | number, cls = ""): void => {
        const element = document.createElement("span");
        element.className = "item" + (cls ? " " + cls : "");
        element.innerHTML = label + ": <strong>" + value + "</strong>";
        bar.appendChild(element);
    };

    if (isCryptoFileView()) {
        const entry = app.selectedEntryId
            ? entryIndex.get(app.selectedEntryId)
            : undefined;

        const values = entry?.values || {};

        item("Type", values.Type || "Crypto file");

        if (values.Algorithm) {
            item("Algorithm", values.Algorithm);
        }

        if (values["Key size"]) {
            item("Key size", values["Key size"]);
        }

        if (values.Curve) {
            item("Curve", values.Curve);
        }

        if (values["Valid to"]) {
            const expired = app.state.stats && app.state.stats.expired > 0;
            item("Valid to", values["Valid to"], expired ? "err" : "");
        }

        if (values["Public key algorithm"]) {
            item("Public key", values["Public key algorithm"]);
        }

        if (entry) {
            item("Empty values", countEmptyValues(entry));
        }

        if (entry?.hasPrivateKey) {
            item(
                "Private key",
                app.privateKeyVisible ? "shown" : "hidden",
                app.privateKeyVisible ? "warn" : ""
            );
        }

        return;
    }

    const stats = app.state.stats;

    item("Groups", stats.groups);
    item("Entries", stats.entries);
    item("Duplicates", stats.duplicates, stats.duplicates > 0 ? "warn" : "");
    item("Weak", stats.weak, stats.weak > 0 ? "warn" : "");
    item("Expired", stats.expired, stats.expired > 0 ? "err" : "");
    item("Empty groups", stats.emptyGroups);
}

function countEmptyValues(entry: EntryView): number {
    const fields = entry.fields || [];
    let count = 0;

    for (const field of fields) {
        const value = entry.values && entry.values[field] !== undefined
            ? entry.values[field]
            : "";

        if (!value) {
            count++;
        }
    }

    return count;
}
