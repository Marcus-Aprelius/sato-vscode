import * as path from "path";
import * as vscode from "vscode";

import { APP_VERSION } from "./buildInfo";
import { isArchiveUri } from "./editor/uriTypes";
import { persistKdbx } from "./editor/persistence";
import { copyToClipboard } from "./editor/clipboard";
import { openArchiveFile } from "./editor/archiveFiles";
import { openCertificateFile } from "./editor/cryptoFiles";
import { handleEditorMessage } from "./editor/messageHandler";
import { createVaultDocument } from "./editor/documentLifecycle";
import { readSettings, updateSettings } from "./editor/settings";
import { configurePanelLifecycle } from "./editor/panelLifecycle";
import { clearAutoLock, scheduleAutoLock } from "./editor/autoLock";
import { configureEditorLifecycle } from "./editor/editorLifecycle";
import { checkForUpdates, openExternalUrl } from "./editor/updates";
import { openOnePifFile, unlockVaultWithPassword } from "./editor/vaultOpeners";
import { registerConfigurationLifecycle } from "./editor/configurationLifecycle";
import { renderEditorState, renderLockedShell } from "./editor/renderEditorState";

import type { Settings } from "./webview";
import type { VaultAdapterRuntime } from "./vaultAdapters";
import type { ActiveEditor, FromWebview, VaultDocument } from "./types";

export class KdbxEditorProvider
implements vscode.CustomReadonlyEditorProvider<VaultDocument> {
    public static readonly viewType = "sato.kdbxViewer";
    private readonly editors = new Set<ActiveEditor>();

    constructor(
        private readonly context: vscode.ExtensionContext
    ) {
        registerConfigurationLifecycle(
            context,
            {editors: this.editors, readSettings: () => this.readSettings(), scheduleAutoLock: (editor) => this.scheduleAutoLock(editor)}
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

    async openCustomDocument(
        uri: vscode.Uri
    ): Promise<VaultDocument> {
        return createVaultDocument(uri);
    }

    async resolveCustomEditor(
        document: VaultDocument,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        const editor: ActiveEditor = {document, panel, unlock: async () => {}, lock: () => {}, reload: async () => {}};

        configureEditorLifecycle(
            editor,
            {
                clearAutoLock: (targetEditor) => {this.clearAutoLock(targetEditor);},
                openArchiveFile: (targetDocument, targetPanel) => {return this.openArchiveFile(targetDocument, targetPanel);},
                openCertificateFile: (targetDocument, targetPanel) => {return this.openCertificateFile(targetDocument, targetPanel);},
                openOnePifFile: (targetDocument, targetPanel) => {return this.openOnePifFile(targetDocument, targetPanel);},
                renderLockedShell: (targetDocument, targetPanel, openUnlockModal) => {this.renderLockedShell(targetDocument, targetPanel, openUnlockModal);}
            }
        );

        this.editors.add(editor);

        configurePanelLifecycle(editor,
            {
                extensionUri: this.context.extensionUri,
                scheduleAutoLock: (targetEditor) => {this.scheduleAutoLock(targetEditor);},
                clearAutoLock: (targetEditor) => {this.clearAutoLock(targetEditor);},
                handleMessage: (msg) => {
                    return this.handleMessage(
                        document, panel, msg, editor.reload, editor.lock,
                        filePath => this.openSupportedFile(document, panel, filePath),
                        () => this.scheduleAutoLock(editor)
                    );
                },
                removeEditor: (targetEditor) => {this.editors.delete(targetEditor);
                }
            }
        );

        await editor.unlock();

        if (document.archive) {
            this.configureArchiveDirectoryWatcher(editor);
        }

    }

    private configureArchiveDirectoryWatcher(
        editor: ActiveEditor
    ): void {
        const directoryPath = path.dirname(editor.document.uri.fsPath);
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(directoryPath), "*"));

        let refreshTimer: NodeJS.Timeout | undefined;
        let disposed = false;

        const scheduleRefresh = (
            uri: vscode.Uri
        ): void => {
            if (!isArchiveUri(uri)) {
                return;
            }

            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }

            refreshTimer = setTimeout(() => {
                if (disposed) {
                    return;
                }

                void editor.reload();
            }, 400
        );
    };

        const createSubscription = watcher.onDidCreate(scheduleRefresh);
        const changeSubscription = watcher.onDidChange(scheduleRefresh);
        const deleteSubscription = watcher.onDidDelete(scheduleRefresh);

        editor.panel.onDidDispose(() => {disposed = true;

            if (refreshTimer) {
                clearTimeout(refreshTimer);
                refreshTimer = undefined;
            }

            createSubscription.dispose();
            changeSubscription.dispose();
            deleteSubscription.dispose();
            watcher.dispose();
        });
    }

    private adapterRuntime(): VaultAdapterRuntime {
        return {
            readSettings: () => this.readSettings(),
            copyToClipboard: (value, message, settings) => this.copyToClipboard(value, message, settings),
            persist: (document, panel, successMessage) => this.persist(document, panel, successMessage)
        };
    }

    private renderLockedShell(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        openUnlockModal: boolean
    ): void {
        renderLockedShell(
            {extensionUri: this.context.extensionUri, readSettings: () => this.readSettings()},
            document, panel, openUnlockModal
        );
    }

    private async handleMessage(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        msg: FromWebview,
        reload: () => Promise<void>,
        lock: () => void,
        openSupportedFile: (filePath: string) => Promise<void>,
        scheduleAutoLockCallback: () => void
    ): Promise<void> {
        await handleEditorMessage(document, panel, msg, {
            viewType: KdbxEditorProvider.viewType,
            reload, lock,
            openSupportedFile,
            scheduleAutoLock: scheduleAutoLockCallback,
            readSettings: () => this.readSettings(),
            updateSettings: (settings) => this.updateSettings(settings),
            checkForUpdates: () => this.checkForUpdates(),
            openExternalUrl: (url) => this.openExternalUrl(url),
            unlockWithPassword: (password) => this.unlockWithPassword(document, panel, password, scheduleAutoLockCallback),
            adapterRuntime: this.adapterRuntime()
        });
    }

    private async openSupportedFile(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        filePath: string
    ): Promise<void> {
        const previousActiveUri = document.activeUri;
        const targetUri = vscode.Uri.file(filePath);

        document.activeUri = targetUri;
        const opened = isArchiveUri(targetUri) ? await openArchiveFile(document) : await openCertificateFile(document);

        if (!opened) {
            document.activeUri = previousActiveUri;
            return;
        }

        this.renderState(document, panel, false);

        if (document.archive?.inspection.encrypted && !document.archive.password) {
            setTimeout(() => {void panel.webview.postMessage({type: "openArchiveUnlock"});}, 100);
        }
    }

    private async openArchiveFile(
        document: VaultDocument,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        const opened = await openArchiveFile(document);

        if (!opened) {
            return;
        }

        this.renderState(document, panel, true);

        if (!document.archive?.inspection.encrypted) {
            return;
        }

        setTimeout(() => {panel.webview.postMessage({type: "openArchiveUnlock"});}, 100);
    }

    private async openOnePifFile(
        document: VaultDocument,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        const opened = await openOnePifFile(document);

        if (!opened) {
            return;
        }

        this.renderState(document, panel, true);
    }

    private async openCertificateFile(
        document: VaultDocument,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        const opened = await openCertificateFile(document);

        if (!opened) {
            return;
        }

        this.renderState(document, panel, true);
    }

    private async unlockWithPassword(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        password: string,
        scheduleAutoLockCallback: () => void
    ): Promise<void> {
        const unlocked = await unlockVaultWithPassword(document, panel, password);

        if (!unlocked) {
            return;
        }

        this.renderState(document, panel, true);
        scheduleAutoLockCallback();
    }

    private async checkForUpdates(): Promise<void> {
        await checkForUpdates(APP_VERSION);
    }

    private async openExternalUrl(rawUrl: string): Promise<void> {
        await openExternalUrl(rawUrl);
    }

    private async copyToClipboard(value: string, message: string, settings: Settings): Promise<void> {
        await copyToClipboard(value, message, settings);
    }

    private scheduleAutoLock(editor: ActiveEditor): void {
        scheduleAutoLock(editor, this.readSettings().autoLockTimeout);
    }

    private clearAutoLock(editor: ActiveEditor): void {
        clearAutoLock(editor);
    }

    private readSettings(): Settings {
        return readSettings();
    }

    private async updateSettings(settings: Settings): Promise<void> {
        await updateSettings(settings);
    }

    private async persist(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        successMessage: string
    ): Promise<void> {
        const saved = await persistKdbx(document, successMessage);

        if (!saved) {
            return;
        }

        this.renderState(document, panel, false);
    }

    private renderState(
        document: VaultDocument,
        panel: vscode.WebviewPanel,
        initialLoad: boolean
    ): void {
        renderEditorState({extensionUri: this.context.extensionUri, readSettings: () => this.readSettings()}, document, panel, initialLoad);
    }
}
