import * as vscode from "vscode";
import { APP_VERSION, GIT_COMMIT } from "./buildInfo";
import { SUPPORTED_VAULT_FILTERS } from "./constants";
import { renderVault, type Settings } from "./webview";
import {isPsafeUri,type VaultAdapterRuntime} from "./vaultAdapters";
import {handleKdbxMessage, unlockKdbxVault} from "./vaultAdapters/kdbxAdapter";
import {handlePsafeMessage, unlockPsafeVault} from "./vaultAdapters/psafeAdapter";

import {
    buildTree,
    computeStats,
    type GroupView,
    type VaultStats
} from "./vault";
import type {
    ActiveEditor,
    FromWebview,
    VaultDocument
} from "./types";

export class KdbxEditorProvider implements vscode.CustomReadonlyEditorProvider<VaultDocument> {
    public static readonly viewType = "sato.kdbxViewer";

    private readonly editors = new Set<ActiveEditor>();
    private lastClipboardCopy: string | undefined;
    private adapterRuntime(): VaultAdapterRuntime {
        return {
            readSettings: () => this.readSettings(),
            copyToClipboard: (value, message, settings) =>
                this.copyToClipboard(value, message, settings),
            persist: (document, panel, successMessage) =>
                this.persist(document, panel, successMessage)
        };
    }

    constructor(private readonly context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (!e.affectsConfiguration("sato")) {
                    return;
                }

                const settings = this.readSettings();

                for (const ed of this.editors) {
                    ed.panel.webview.postMessage({
                        type: "settingsUpdated",
                        settings
                    });

                    this.scheduleAutoLock(ed);
                }
            })
        );
    }

    getActiveEditor(): ActiveEditor | undefined {
        for (const editor of this.editors) {
            if (editor.panel.active) {
                return editor;
            }
        }

        return undefined;
    }

    async openCustomDocument(uri: vscode.Uri): Promise<VaultDocument> {
        const doc: VaultDocument = {
            uri,
            dispose: () => {
                doc.db = undefined;
                doc.credentials = undefined;
                doc.psafe = undefined;
            }
        };

        return doc;
    }

    async resolveCustomEditor(
        document: VaultDocument,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, "assets")
            ]
        };

        const editor: ActiveEditor = {
            document,
            panel,
            unlock: async () => {},
            lock: () => {},
            reload: async () => {}
        };

        editor.unlock = async () => {
            this.renderLockedShell(document, panel, true);
        };

        editor.lock = () => {
            this.clearAutoLock(editor);

            document.db = undefined;
            document.credentials = undefined;
            document.psafe = undefined;

            panel.webview.postMessage({ type: "vaultLocked" });
        };

        editor.reload = async () => {
            this.clearAutoLock(editor);

            document.db = undefined;
            document.credentials = undefined;
            document.psafe = undefined;

            this.renderLockedShell(document, panel, true);
        };

        this.editors.add(editor);

        panel.webview.onDidReceiveMessage((msg: FromWebview) => {
            this.scheduleAutoLock(editor);

            void this.handleMessage(
                document,
                panel,
                msg,
                editor.reload,
                editor.lock,
                () => this.scheduleAutoLock(editor)
            );
        });

        panel.onDidChangeViewState(() => {
            if (panel.active) {
                this.scheduleAutoLock(editor);
            }
        });

        panel.onDidDispose(() => {
            this.clearAutoLock(editor);

            document.db = undefined;
            document.credentials = undefined;
            document.psafe = undefined;

            this.editors.delete(editor);
        });

        await editor.unlock();
    }

    private renderLockedShell(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        openUnlockModal: boolean
    ): void {
        const root: GroupView = {
            id: "locked-root",
            parentId: null,
            name: "Vault",
            groups: [],
            entries: []
        };

        const stats: VaultStats = {
            groups: 0,
            entries: 0,
            duplicates: 0,
            expired: 0,
            emptyGroups: 0,
            weak: 0
        };

        const settings = this.readSettings();

        const codiconsCssUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "codicons",
            "codicon.css"
        );

        const logoUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "sato.png"
        );

        panel.webview.html = renderVault(
            panel.webview,
            document.uri,
            root,
            stats,
            settings,
            logoUri,
            codiconsCssUri,
            APP_VERSION,
            GIT_COMMIT
        );

        setTimeout(() => {
            panel.webview.postMessage({ type: "vaultLocked" });

            if (openUnlockModal) {
                panel.webview.postMessage({ type: "openUnlockModal" });
            }
        }, 100);
    }

    private async handleMessage(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        msg: FromWebview,
        reload: () => Promise<void>,
        lock: () => void,
        scheduleAutoLock: () => void
    ): Promise<void> {
        if (msg.type === "unlock" || msg.type === "reload") {
            await reload();
            return;
        }

        if (msg.type === "lock") {
            lock();
            return;
        }

        if (msg.type === "openDb") {
            const selected = await vscode.window.showOpenDialog({
                title: "SATO - Open Password Vault",
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: SUPPORTED_VAULT_FILTERS
            });

            const uri = selected?.[0];

            if (!uri) {
                return;
            }

            await vscode.commands.executeCommand(
                "vscode.openWith",
                uri,
                KdbxEditorProvider.viewType
            );

            return;
        }

        if (msg.type === "unlockWithPassword") {
            await this.unlockWithPassword(document, panel, msg.password, scheduleAutoLock);
            return;
        }

        if (msg.type === "updateSettings") {
            await this.updateSettings(msg.settings);
            vscode.window.setStatusBarMessage("SATO: settings saved", 2000);
            return;
        }

        if (msg.type === "openUrl") {
            await this.openExternalUrl(msg.url);
            return;
        }

        if (document.psafe) {
            await handlePsafeMessage(
                document,
                panel,
                msg,
                this.adapterRuntime()
            );
            return;
        }

        if (document.db) {
            await handleKdbxMessage(
                document,
                panel,
                msg,
                this.adapterRuntime()
            );
        }
    }

    private async unlockWithPassword(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        password: string,
        scheduleAutoLock: () => void
    ): Promise<void> {
        let bytes: Uint8Array;

        try {
            bytes = await vscode.workspace.fs.readFile(document.uri);
        } catch (err) {
            panel.webview.postMessage({
                type: "unlockFailed",
                message: `Failed to read file: ${describeError(err)}`
            });
            return;
        }

        if (isPsafeUri(document.uri)) {
            try {
                await unlockPsafeVault(document, bytes, password);

                this.renderState(document, panel, true);
                scheduleAutoLock();
            } catch {
                panel.webview.postMessage({
                    type: "unlockFailed",
                    message: "Wrong password or unsupported Password Safe file."
                });
            }

            return;
        }

        try {
            await unlockKdbxVault(document, bytes, password);

            this.renderState(document, panel, true);
            scheduleAutoLock();
        } catch {
            panel.webview.postMessage({
                type: "unlockFailed",
                message: "Wrong password. Try again."
            });
        }
    }


    private async updateSettings(settings: Settings): Promise<void> {
        const cfg = vscode.workspace.getConfiguration("sato");

        await cfg.update("autoLockTimeout", settings.autoLockTimeout, vscode.ConfigurationTarget.Global);
        await cfg.update("clipboardClearTimeout", settings.clipboardClearTimeout, vscode.ConfigurationTarget.Global);
        await cfg.update("passwordGeneratorLength", settings.passwordGeneratorLength, vscode.ConfigurationTarget.Global);
        await cfg.update("confirmBeforeDelete", settings.confirmBeforeDelete, vscode.ConfigurationTarget.Global);
        await cfg.update("showPasswordsByDefault", settings.showPasswordsByDefault, vscode.ConfigurationTarget.Global);
        await cfg.update("showStatusBar", settings.showStatusBar, vscode.ConfigurationTarget.Global);
    }

    private async openExternalUrl(rawUrl: string): Promise<void> {
        const value = rawUrl.trim();

        if (!value) {
            return;
        }

        const url = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)
            ? value
            : `https://${value}`;

        let uri: vscode.Uri;

        try {
            uri = vscode.Uri.parse(url, true);
        } catch {
            vscode.window.showWarningMessage("SATO: invalid URL");
            return;
        }

        if (uri.scheme !== "http" && uri.scheme !== "https") {
            vscode.window.showWarningMessage("SATO: only http and https URLs are supported");
            return;
        }

        await vscode.env.openExternal(uri);
    }

    private async copyToClipboard(
        value: string,
        message: string,
        settings: Settings
    ): Promise<void> {
        await vscode.env.clipboard.writeText(value);

        this.lastClipboardCopy = value;
        vscode.window.setStatusBarMessage(message, 2500);

        if (settings.clipboardClearTimeout > 0) {
            const expected = value;

            setTimeout(() => {
                void this.clearClipboardIfUnchanged(expected);
            }, settings.clipboardClearTimeout * 1000);
        }
    }

    private async clearClipboardIfUnchanged(expected: string): Promise<void> {
        try {
            const current = await vscode.env.clipboard.readText();

            if (current === expected) {
                await vscode.env.clipboard.writeText("");

                if (this.lastClipboardCopy === expected) {
                    this.lastClipboardCopy = undefined;
                }

                vscode.window.setStatusBarMessage("SATO: clipboard cleared", 1500);
            }
        } catch {
            // ignore
        }
    }

    private scheduleAutoLock(editor: ActiveEditor): void {
        this.clearAutoLock(editor);

        if (!editor.document.db && !editor.document.psafe) {
            return;
        }

        const minutes = this.readSettings().autoLockTimeout;

        if (minutes <= 0) {
            return;
        }

        editor.autoLockTimer = setTimeout(() => {
            if (editor.document.db || editor.document.psafe) {
                editor.lock();
                vscode.window.setStatusBarMessage("SATO: vault auto-locked", 3000);
            }
        }, minutes * 60 * 1000);
    }

    private clearAutoLock(editor: ActiveEditor): void {
        if (editor.autoLockTimer) {
            clearTimeout(editor.autoLockTimer);
            editor.autoLockTimer = undefined;
        }
    }

    private readSettings(): Settings {
        const cfg = vscode.workspace.getConfiguration("sato");

        return {
            autoLockTimeout: cfg.get<number>("autoLockTimeout", 0),
            clipboardClearTimeout: cfg.get<number>("clipboardClearTimeout", 0),
            passwordGeneratorLength: cfg.get<number>("passwordGeneratorLength", 20),
            confirmBeforeDelete: cfg.get<boolean>("confirmBeforeDelete", true),
            showPasswordsByDefault: cfg.get<boolean>("showPasswordsByDefault", false),
            showStatusBar: cfg.get<boolean>("showStatusBar", true)
        };
    }


    private async persist(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        successMessage: string
    ): Promise<void> {
        const db = document.db;

        if (!db) {
            return;
        }

        try {
            const buf = await db.save();
            const bytes = new Uint8Array(buf);

            await vscode.workspace.fs.writeFile(document.uri, bytes);

            vscode.window.setStatusBarMessage(`SATO: ${successMessage}`, 2500);
        } catch (err) {
            await vscode.window.showErrorMessage(`SATO: save failed - ${describeError(err)}`);
        }

        this.renderState(document, panel, false);
    }

    private renderState(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        initialLoad: boolean
    ): void {
        const settings = this.readSettings();

        const codiconsCssUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "codicons",
            "codicon.css"
        );

        const logoUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "sato.png"
        );

        if (document.psafe) {
            if (initialLoad) {
                panel.webview.html = renderVault(
                    panel.webview,
                    document.uri,
                    document.psafe.tree,
                    document.psafe.stats,
                    settings,
                    logoUri,
                    codiconsCssUri,
                    APP_VERSION,
                    GIT_COMMIT
                );
            } else {
                panel.webview.postMessage({
                    type: "vaultState",
                    state: {
                        tree: document.psafe.tree,
                        stats: document.psafe.stats,
                        settings
                    }
                });
            }

            return;
        }

        const db = document.db;

        if (!db) {
            return;
        }

        const tree: GroupView = buildTree(db);
        const stats: VaultStats = computeStats(db);

        if (initialLoad) {
            panel.webview.html = renderVault(
                panel.webview,
                document.uri,
                tree,
                stats,
                settings,
                logoUri,
                codiconsCssUri,
                APP_VERSION,
                GIT_COMMIT
            );
        } else {
            panel.webview.postMessage({
                type: "vaultState",
                state: {
                    tree,
                    stats,
                    settings
                }
            });
        }
    }
}

function describeError(err: unknown): string {
    if (err instanceof Error) {
        return err.message;
    }

    return String(err);
}
