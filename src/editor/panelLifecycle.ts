import * as vscode from "vscode";
import { clearDocumentState } from "./vaultOpeners";

import type { ActiveEditor, FromWebview } from "../types";

export interface PanelLifecycleRuntime {
    extensionUri: vscode.Uri;

    scheduleAutoLock: (editor: ActiveEditor) => void;
    clearAutoLock: (editor: ActiveEditor) => void;
    handleMessage: (msg: FromWebview) => Promise<void>;
    removeEditor: (editor: ActiveEditor) => void;
}

export function configurePanelLifecycle(
    editor: ActiveEditor,
    runtime: PanelLifecycleRuntime
): void {
    const {document, panel} = editor;

    panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
            vscode.Uri.joinPath(runtime.extensionUri, "assets"),
            vscode.Uri.joinPath(runtime.extensionUri, "dist")
        ]
    };

    panel.webview.onDidReceiveMessage(
        (msg: FromWebview) => {
            runtime.scheduleAutoLock(editor);

            void runtime.handleMessage(msg).catch((err) => {
                console.error("SATO: failed to handle webview message:", err);

                vscode.window.showErrorMessage(
                    err instanceof Error ? `SATO: operation failed - ${err.message}` : "SATO: operation failed."
                );
            });
        }
    );

    panel.onDidChangeViewState(() => {
        if (panel.active) {
            runtime.scheduleAutoLock(editor);
        }
    });

    panel.onDidDispose(() => {
        runtime.clearAutoLock(editor);
        clearDocumentState(document);
        runtime.removeEditor(editor);
    });
}
