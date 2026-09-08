import * as vscode from "vscode";

import type { Settings } from "../webview";

let lastClipboardCopy: string | undefined;

export async function copyToClipboard(
    value: string,
    message: string,
    settings: Settings
): Promise<void> {
    await vscode.env.clipboard.writeText(value);

    lastClipboardCopy = value;

    vscode.window.setStatusBarMessage(message, 2500);

    if (settings.clipboardClearTimeout <= 0) {
        return;
    }

    const expected = value;

    setTimeout(() => {
        void clearClipboardIfUnchanged(
            expected
        );
    }, settings.clipboardClearTimeout * 1000);
}

async function clearClipboardIfUnchanged(
    expected: string
): Promise<void> {
    try {
        const current = await vscode.env.clipboard.readText();

        if (current !== expected) {
            return;
        }

        await vscode.env.clipboard.writeText("");

        if (lastClipboardCopy === expected) {
            lastClipboardCopy = undefined;
        }

        vscode.window.setStatusBarMessage("SATO: clipboard cleared", 1500);

    } catch {
        // Ignore clipboard access errors.
    }
}
