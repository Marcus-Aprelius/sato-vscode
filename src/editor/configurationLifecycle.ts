import * as vscode from "vscode";

import type { ActiveEditor } from "../types";
import type { Settings } from "../webview";

export interface ConfigurationLifecycleRuntime {
    editors: ReadonlySet<ActiveEditor>;

    readSettings: () => Settings;

    scheduleAutoLock: (
        editor: ActiveEditor
    ) => void;
}

export function registerConfigurationLifecycle(
    context: vscode.ExtensionContext,
    runtime: ConfigurationLifecycleRuntime
): void {
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(
            (event) => {
                if (
                    !event.affectsConfiguration(
                        "sato"
                    )
                ) {
                    return;
                }

                const settings =
                    runtime.readSettings();

                for (const editor of runtime.editors) {
                    editor.panel.webview.postMessage({
                        type: "settingsUpdated",
                        settings
                    });

                    runtime.scheduleAutoLock(
                        editor
                    );
                }
            }
        )
    );
}
