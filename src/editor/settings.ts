import * as vscode from "vscode";

import type { Settings } from "../webview";

export function readSettings(): Settings {
    const cfg = vscode.workspace.getConfiguration("sato");

    return {
        autoLockTimeout: cfg.get<number>("autoLockTimeout", 0),
        clipboardClearTimeout: cfg.get<number>("clipboardClearTimeout", 0),
        passwordGeneratorLength: cfg.get<number>("passwordGeneratorLength", 20),
        confirmBeforeDelete: cfg.get<boolean>("confirmBeforeDelete", true),
        showPasswordsByDefault: cfg.get<boolean>("showPasswordsByDefault", false),
        showEmptyValuesByDefault: cfg.get<boolean>("showEmptyValuesByDefault", true),
        showStatusBar: cfg.get<boolean>("showStatusBar", true)
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
}
