import type * as vscode from "vscode";
import type { VaultDocument } from "../types";
import { clearDocumentState } from "./vaultOpeners";

export function createVaultDocument(
    uri: vscode.Uri
): VaultDocument {
    const document: VaultDocument = {
        uri,
        dispose: () => {clearDocumentState(document);}
    };

    return document;
}
