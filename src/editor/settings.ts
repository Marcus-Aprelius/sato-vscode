import * as vscode from "vscode";

import type { Settings } from "../webview";
import type { AppTheme, FileCategoryFilter } from "../webview/render/types";

const FILE_CATEGORY_FILTERS: ReadonlyArray<FileCategoryFilter> = ["vaults", "archives", "ssh", "crypto" ];

export function readSettings(): Settings {
    const cfg = vscode.workspace.getConfiguration("sato");

    return {
        autoLockTimeout: cfg.get<number>("autoLockTimeout", 0),
        clipboardClearTimeout: cfg.get<number>("clipboardClearTimeout", 0),
        passwordGeneratorLength: cfg.get<number>("passwordGeneratorLength", 20),
        confirmBeforeDelete: cfg.get<boolean>("confirmBeforeDelete", true),
        showPasswordsByDefault: cfg.get<boolean>("showPasswordsByDefault", false),
        showEmptyValuesByDefault: cfg.get<boolean>("showEmptyValuesByDefault", true),
        showStatusBar: cfg.get<boolean>("showStatusBar", true),
        createArchiveBackups: cfg.get<boolean>("createArchiveBackups", true),
        fileCategoryFilters: readFileCategoryFilters(cfg),
        theme: readTheme(cfg)
    };
}

export async function updateSettings(
    settings: Settings
): Promise<void> {
    const cfg = vscode.workspace.getConfiguration("sato");

    await cfg.update("autoLockTimeout", settings.autoLockTimeout, vscode.ConfigurationTarget.Global);
    await cfg.update("clipboardClearTimeout", settings.clipboardClearTimeout, vscode.ConfigurationTarget.Global);
    await cfg.update("passwordGeneratorLength", settings.passwordGeneratorLength, vscode.ConfigurationTarget.Global);
    await cfg.update("confirmBeforeDelete", settings.confirmBeforeDelete, vscode.ConfigurationTarget.Global);
    await cfg.update("showPasswordsByDefault", settings.showPasswordsByDefault, vscode.ConfigurationTarget.Global);
    await cfg.update("showEmptyValuesByDefault", settings.showEmptyValuesByDefault, vscode.ConfigurationTarget.Global);
    await cfg.update("showStatusBar", settings.showStatusBar, vscode.ConfigurationTarget.Global);
    await cfg.update("createArchiveBackups", settings.createArchiveBackups, vscode.ConfigurationTarget.Global);
    await cfg.update("fileCategoryFilters", normalizeFileCategoryFilters(settings.fileCategoryFilters), vscode.ConfigurationTarget.Global);
    await cfg.update("theme", settings.theme, vscode.ConfigurationTarget.Global);
}

function readFileCategoryFilters(
    cfg: vscode.WorkspaceConfiguration
): FileCategoryFilter[] {
    const configured = cfg.get<unknown>("fileCategoryFilters", ["all"]);

    if (!Array.isArray(configured)) {
        return ["all"];
    }

    return normalizeFileCategoryFilters(configured);
}

function normalizeFileCategoryFilters(
    values: ReadonlyArray<unknown>
): FileCategoryFilter[] {
    if (values.includes("all")) {
        return ["all"];
    }

    const selected = new Set<FileCategoryFilter>();

    for (const value of values) {
        if (value === "vaults" || value === "archives" || value === "ssh" || value === "crypto") {
            selected.add(value);
        }
    }

    const normalized = FILE_CATEGORY_FILTERS.filter(category => selected.has(category));

    if (normalized.length === FILE_CATEGORY_FILTERS.length) {
        return ["all"];
    }

    return normalized.length > 0 ? normalized : ["all"];

}

function readTheme(
    cfg: vscode.WorkspaceConfiguration
): AppTheme {
    const value = cfg.get<string>("theme", "vscode");

    switch (value) {
        case "dark":
        case "gray":
        case "light":
            return value;

        default:
            return "vscode";
    }
}
