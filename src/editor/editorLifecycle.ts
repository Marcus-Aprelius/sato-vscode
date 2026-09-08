import * as vscode from "vscode";
import { isOnePifUri } from "./uriTypes";
import { clearDocumentState } from "./vaultOpeners";
import { isCertificateLikeUri } from "../certificates";

import type { ActiveEditor, VaultDocument } from "../types";

export interface EditorLifecycleRuntime {
    clearAutoLock: (
        editor: ActiveEditor
    ) => void;

    openCertificateFile: (
        document: VaultDocument,
        panel: vscode.WebviewPanel
    ) => Promise<void>;

    openOnePifFile: (
        document: VaultDocument,
        panel: vscode.WebviewPanel
    ) => Promise<void>;

    renderLockedShell: (
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        openUnlockModal: boolean
    ) => void;
}

export function configureEditorLifecycle(
    editor: ActiveEditor,
    runtime: EditorLifecycleRuntime
): void {
    const {document, panel} = editor;

    editor.unlock = async () => {
        await openDocument(document, panel, runtime);
    };

    editor.lock = () => {
        runtime.clearAutoLock(editor);
        clearDocumentState(document);
        panel.webview.postMessage({type: "vaultLocked"});
    };

    editor.reload = async () => {
        runtime.clearAutoLock(editor);
        clearDocumentState(document);
        await openDocument(document, panel, runtime);
    };
}

async function openDocument(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    runtime: EditorLifecycleRuntime
): Promise<void> {
    if (isCertificateLikeUri(document.uri)) {
        await runtime.openCertificateFile(document, panel);

        return;
    }

    if (isOnePifUri(document.uri)) {
        await runtime.openOnePifFile(document, panel);

        return;
    }

    runtime.renderLockedShell(document, panel, true);
}
