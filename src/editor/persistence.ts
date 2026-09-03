import * as vscode from "vscode";

import type { VaultDocument } from "../types";

export async function persistKdbx(
    document: VaultDocument,
    successMessage: string
): Promise<boolean> {
    const db = document.db;

    if (!db) {
        return false;
    }

    try {
        const buffer = await db.save();
        const bytes = new Uint8Array(buffer);

        await vscode.workspace.fs.writeFile(document.uri, bytes);
        vscode.window.setStatusBarMessage(`SATO: ${successMessage}`, 2500);

        return true;

    } catch (err) {
        await vscode.window.showErrorMessage(`SATO: save failed - ${describeError(err)}`);

        return false;
    }
}

function describeError(
    err: unknown
): string {
    if (err instanceof Error) {
        return err.message;
    }

    return String(err);
}
