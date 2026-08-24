import * as vscode from "vscode";

import type { ActiveEditor } from "../types";

export function scheduleAutoLock(
    editor: ActiveEditor,
    timeoutMinutes: number
): void {
    clearAutoLock(editor);

    if (
        !editor.document.db &&
        !editor.document.psafe &&
        !editor.document.certificate &&
        !editor.document.importedVault
    ) {
        return;
    }

    if (editor.document.certificate) {
        return;
    }

    if (
        editor.document.importedVault?.format ===
        "1pif"
    ) {
        return;
    }

    if (timeoutMinutes <= 0) {
        return;
    }

    editor.autoLockTimer = setTimeout(() => {
        if (
            editor.document.db ||
            editor.document.psafe ||
            editor.document.importedVault?.format ===
                "bcup"
        ) {
            editor.lock();

            vscode.window.setStatusBarMessage(
                "SATO: vault auto-locked",
                3000
            );
        }
    }, timeoutMinutes * 60 * 1000);
}

export function clearAutoLock(
    editor: ActiveEditor
): void {
    if (!editor.autoLockTimer) {
        return;
    }

    clearTimeout(editor.autoLockTimer);
    editor.autoLockTimer = undefined;
}
