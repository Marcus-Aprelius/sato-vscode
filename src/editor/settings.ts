import * as vscode from "vscode";

import type { Settings } from "../webview";
import type {
    AppTheme,
    Base64DefaultFormat,
    Base64DefaultOperation,
    FileCategoryFilter,
    YamlJsonDefaultOperation,
    YamlJsonIndentation
} from "../webview/render/types";

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
        base64DefaultOperation: readBase64DefaultOperation(cfg),
        base64DefaultFormat: readBase64DefaultFormat(cfg),
        yamlJsonDefaultOperation: readYamlJsonDefaultOperation(cfg),
        yamlJsonIndentation: readYamlJsonIndentation(cfg),
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
    await cfg.update("base64DefaultOperation", settings.base64DefaultOperation, vscode.ConfigurationTarget.Global);
    await cfg.update("base64DefaultFormat", settings.base64DefaultFormat, vscode.ConfigurationTarget.Global);
    await cfg.update("yamlJsonDefaultOperation", settings.yamlJsonDefaultOperation, vscode.ConfigurationTarget.Global);
    await cfg.update("yamlJsonIndentation", settings.yamlJsonIndentation, vscode.ConfigurationTarget.Global);
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

function readBase64DefaultFormat(
    cfg: vscode.WorkspaceConfiguration
): Base64DefaultFormat {
    const value = cfg.get<string>("base64DefaultFormat", "base64url");

    switch (value) {
        case "base64":
        case "base32":
        case "base32hex":
        case "hex":
            return value;

        default:
            return "base64url";
    }
}

function readYamlJsonIndentation(
    cfg: vscode.WorkspaceConfiguration
): YamlJsonIndentation {
    const value = cfg.get<string>("yamlJsonIndentation", "spaces-2");

    switch (value) {
        case "spaces-4":
        case "tabs":
            return value;

        default:
            return "spaces-2";
    }
}

function readBase64DefaultOperation(
    cfg: vscode.WorkspaceConfiguration
): Base64DefaultOperation {
    return cfg.get<string>("base64DefaultOperation", "encode") === "decode" ? "decode" : "encode";
}

function readYamlJsonDefaultOperation(
    cfg: vscode.WorkspaceConfiguration
): YamlJsonDefaultOperation {
    return cfg.get<string>("yamlJsonDefaultOperation", "yaml-to-json") === "json-to-yaml" ? "json-to-yaml" : "yaml-to-json";
}
