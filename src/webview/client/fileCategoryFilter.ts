import { vscode } from "./globals";
import { app } from "./state";

import type { FileCategoryFilter } from "../render/types";

export const FILE_CATEGORIES: ReadonlyArray<FileCategoryFilter> = ["vaults", "archives", "ssh", "crypto"];

export function normalizeFileCategoryFilters(
    values: ReadonlyArray<FileCategoryFilter> | undefined
): FileCategoryFilter[] {
    if (!values || values.length === 0 || values.includes("all")) {
        return ["all"];
    }

    const selected = new Set(values);
    const normalized = FILE_CATEGORIES.filter(category => selected.has(category));

    if (normalized.length === FILE_CATEGORIES.length) {
        return ["all"];
    }

    return normalized.length > 0 ? normalized : ["all"];
}

export function setFileCategoryFilters(
    filters: FileCategoryFilter[]
): void {
    const normalized = normalizeFileCategoryFilters(filters);
    const next = {...app.settings, fileCategoryFilters: normalized};

    app.settings = next;
    vscode.postMessage({type: "updateSettings", settings: next});
}

export function fileCategoryFilterLabel(
    filters: ReadonlyArray<FileCategoryFilter> | undefined
): string {
    const normalized = normalizeFileCategoryFilters(filters);

    if (normalized.includes("all")) {
        return "All";
    }

    if (normalized.length > 1) {
        return "Multiple";
    }

    switch (normalized[0]) {
        case "vaults":
            return "Vaults";

        case "archives":
            return "Archives";

        case "ssh":
            return "SSH";

        case "crypto":
            return "Crypto Files";

        default:
            return "All";
    }
}
