import * as path from "path";
import * as vscode from "vscode";
import { APP_VERSION, GIT_COMMIT } from "./buildInfo";
import { SUPPORTED_VAULT_FILTERS } from "./constants";
import { renderVault, type Settings } from "./webview";
import { isPsafeUri, type VaultAdapterRuntime } from "./vaultAdapters";
import { handleKdbxMessage, unlockKdbxVault } from "./vaultAdapters/kdbxAdapter";
import { handlePsafeMessage, unlockPsafeVault } from "./vaultAdapters/psafeAdapter";

import {
    buildCertificateDirectoryVault,
    isCertificateLikeFileName,
    isCertificateLikeUri,
    lockCryptoContainer,
    unlockCryptoContainer,
    type CertificateVault,
    type CryptoFileInput
} from "./certificates";

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

    constructor(private readonly context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (!event.affectsConfiguration("sato")) {
                    return;
                }

                const settings = this.readSettings();

                for (const editor of this.editors) {
                    editor.panel.webview.postMessage({
                        type: "settingsUpdated",
                        settings
                    });

                    this.scheduleAutoLock(editor);
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
                doc.certificate = undefined;
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
                vscode.Uri.joinPath(this.context.extensionUri, "assets"),
                vscode.Uri.joinPath(this.context.extensionUri, "dist")
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
            if (isCertificateLikeUri(document.uri)) {
                await this.openCertificateFile(document, panel);
                return;
            }

            this.renderLockedShell(document, panel, true);
        };

        editor.lock = () => {
            this.clearAutoLock(editor);

            document.db = undefined;
            document.credentials = undefined;
            document.psafe = undefined;
            document.certificate = undefined;

            panel.webview.postMessage({ type: "vaultLocked" });
        };

        editor.reload = async () => {
            this.clearAutoLock(editor);

            document.db = undefined;
            document.credentials = undefined;
            document.psafe = undefined;
            document.certificate = undefined;

            if (isCertificateLikeUri(document.uri)) {
                await this.openCertificateFile(document, panel);
                return;
            }

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
            document.certificate = undefined;

            this.editors.delete(editor);
        });

        await editor.unlock();
    }

    private adapterRuntime(): VaultAdapterRuntime {
        return {
            readSettings: () => this.readSettings(),
            copyToClipboard: (value, message, settings) =>
                this.copyToClipboard(value, message, settings),
            persist: (document, panel, successMessage) =>
                this.persist(document, panel, successMessage)
        };
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

        const webviewClientUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "dist",
            "webviewClient.js"
        );

        const logoUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "sato.png"
        );

        const toolbarLogoUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "sato_icon.jpg"
        );

        panel.webview.html = renderVault(
            panel.webview,
            document.uri,
            root,
            stats,
            settings,
            logoUri,
            toolbarLogoUri,
            codiconsCssUri,
            webviewClientUri,
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

        if (msg.type === "openDirectory") {
            const selected = await vscode.window.showOpenDialog({
                title: "SATO - Open Crypto Directory",
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false
            });

            const directoryUri = selected?.[0];

            if (!directoryUri) {
                return;
            }

            const files = await this.readCryptoFilesFromDirectory(directoryUri);

            if (!files.length) {
                vscode.window.showInformationMessage(
                    "SATO: no .crt, .csr, .key, .pem, .p12, .pfx or .jks files found in selected directory"
                );
                return;
            }

            await vscode.commands.executeCommand(
                "vscode.openWith",
                files[0].uri,
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

        if (msg.type === "checkUpdate") {
            await this.checkForUpdates();
            return;
        }

        if (msg.type === "openUrl") {
            await this.openExternalUrl(msg.url);
            return;
        }

        if (document.certificate) {
            if (msg.type === "getDbInfo") {
                const info = await this.collectCryptoFileInfo(
                    document.certificate,
                    msg.entryId || document.certificate.selectedEntryId
                );

                panel.webview.postMessage({
                    type: "dbInfo",
                    info
                });

                return;
            }

            if (msg.type === "unlockCryptoContainer") {
                const result = unlockCryptoContainer(
                    document.certificate,
                    msg.entryId,
                    msg.password
                );

                if (!result.ok) {
                    panel.webview.postMessage({
                        type: "cryptoContainerUnlockFailed",
                        entryId: msg.entryId,
                        message: result.message || "Failed to unlock crypto container."
                    });

                    return;
                }

                panel.webview.postMessage({
                    type: "vaultState",
                    state: {
                        tree: document.certificate.tree,
                        stats: document.certificate.stats,
                        settings: this.readSettings(),
                        selectedEntryId: msg.entryId
                    }
                });

                vscode.window.setStatusBarMessage(
                    "SATO: crypto container unlocked",
                    2500
                );

                return;
            }

            if (msg.type === "lockCryptoContainer") {
                const result = lockCryptoContainer(
                    document.certificate,
                    msg.entryId
                );

                if (!result.ok) {
                    panel.webview.postMessage({
                        type: "cryptoContainerUnlockFailed",
                        entryId: msg.entryId,
                        message: result.message || "Failed to lock crypto container."
                    });

                    return;
                }

                panel.webview.postMessage({
                    type: "vaultState",
                    state: {
                        tree: document.certificate.tree,
                        stats: document.certificate.stats,
                        settings: this.readSettings(),
                        selectedEntryId: msg.entryId
                    }
                });

                vscode.window.setStatusBarMessage(
                    "SATO: crypto container locked",
                    2500
                );

                return;
            }

            if (msg.type === "copyText") {
                await this.copyToClipboard(
                    msg.text,
                    "SATO: copied text",
                    this.readSettings()
                );

                return;
            }

            if (msg.type === "revealPrivateKey") {
                const entryId = msg.entryId || document.certificate.selectedEntryId;

                const privateKeyPem =
                    document.certificate.privateKeysByEntryId?.[entryId] ||
                    document.certificate.privateKeyPem;

                if (!privateKeyPem) {
                    return;
                }

                panel.webview.postMessage({
                    type: "privateKeyRevealed",
                    entryId,
                    value: privateKeyPem
                });

                return;
            }

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

    private async openCertificateFile(
        document: VaultDocument,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        const directoryUri = this.cryptoDirectoryUri(document.uri);
        const files = await this.readCryptoFilesFromDirectory(directoryUri);

        let selectedFiles = files;

        if (!selectedFiles.some((file) => file.uri.fsPath === document.uri.fsPath)) {
            try {
                const bytes = await vscode.workspace.fs.readFile(document.uri);

                selectedFiles = [
                    ...selectedFiles,
                    {
                        uri: document.uri,
                        bytes
                    }
                ];
            } catch (err) {
                vscode.window.showErrorMessage(
                    `SATO: failed to read file - ${describeError(err)}`
                );
                return;
            }
        }

        if (!selectedFiles.length) {
            vscode.window.showErrorMessage("SATO: no supported crypto files found");
            return;
        }

        document.db = undefined;
        document.credentials = undefined;
        document.psafe = undefined;
        document.certificate = buildCertificateDirectoryVault(
            selectedFiles,
            document.uri
        );

        this.renderState(document, panel, true);
    }

    private cryptoDirectoryUri(uri: vscode.Uri): vscode.Uri {
        return vscode.Uri.file(path.dirname(uri.fsPath));
    }

    private async readCryptoFilesFromDirectory(
        directoryUri: vscode.Uri
    ): Promise<CryptoFileInput[]> {
        let entries: [string, vscode.FileType][];

        try {
            entries = await vscode.workspace.fs.readDirectory(directoryUri);
        } catch {
            return [];
        }

        const result: CryptoFileInput[] = [];

        for (const [name, fileType] of entries) {
            if (fileType !== vscode.FileType.File) {
                continue;
            }

            if (!isCertificateLikeFileName(name)) {
                continue;
            }

            const fileUri = vscode.Uri.joinPath(directoryUri, name);

            try {
                const bytes = await vscode.workspace.fs.readFile(fileUri);

                result.push({
                    uri: fileUri,
                    bytes
                });
            } catch {
                // ignore unreadable files
            }
        }

        return result.sort((a, b) =>
            a.uri.fsPath.localeCompare(b.uri.fsPath)
        );
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

    private async collectCryptoFileInfo(
        certificate: CertificateVault,
        entryId: string
    ): Promise<Record<string, unknown>> {
        const entry = this.findCryptoEntry(
            certificate,
            entryId
        );

        if (!entry) {
            return {
                title: "File Info",
                rows: [
                    ["Type", "Crypto file"],
                    ["Summary", "No selected crypto entry."]
                ]
            };
        }

        const values = entry.values || {};
        const rows: [string, string][] = [];

        rows.push(["File name", entry.title]);
        rows.push(["Type", values.Type || "Crypto file"]);

        if (values.Status) {
            rows.push(["Status", values.Status]);
        }

        if (values.Subject) {
            rows.push(["Subject", values.Subject]);
        }

        if (values.Issuer) {
            rows.push(["Issuer", values.Issuer]);
        }

        if (values["Valid from"]) {
            rows.push(["Valid from", values["Valid from"]]);
        }

        if (values["Valid to"]) {
            rows.push(["Valid to", values["Valid to"]]);
        }

        if (values["Public key algorithm"]) {
            rows.push(["Public key algorithm", values["Public key algorithm"]]);
        }

        if (values["Public Key Algorithm"]) {
            rows.push(["Public key algorithm", values["Public Key Algorithm"]]);
        }

        if (values["Key Size"]) {
            rows.push(["Key size", values["Key Size"]]);
        }

        if (values["Key size"]) {
            rows.push(["Key size", values["Key size"]]);
        }

        if (values.Algorithm) {
            rows.push(["Algorithm", values.Algorithm]);
        }

        if (values.Curve) {
            rows.push(["Curve", values.Curve]);
        }

        if (values["Certificate count"]) {
            rows.push(["Certificate count", values["Certificate count"]]);
        }

        if (values["Private key bags"]) {
            rows.push(["Private key bags", values["Private key bags"]]);
        }

        if (values["Friendly names"]) {
            rows.push(["Friendly names", values["Friendly names"]]);
        }

        if (values.Aliases) {
            rows.push(["Aliases", values.Aliases]);
        }

        if (values.Owners) {
            rows.push(["Owners", values.Owners]);
        }

        if (values.Issuers) {
            rows.push(["Issuers", values.Issuers]);
        }

        if (values["Fingerprint SHA-256"]) {
            rows.push(["Fingerprint SHA-256", values["Fingerprint SHA-256"]]);
        }

        if (values["SHA-256"]) {
            rows.push(["SHA-256", values["SHA-256"]]);
        }

        if (values["Container size"]) {
            rows.push(["File size", values["Container size"]]);
        }

        if (values["File path"]) {
            rows.push(["File path", values["File path"]]);
        }

        if (values.Summary) {
            rows.push(["Summary", values.Summary]);
        }

        return {
            title: "File Info",
            rows
        };
    }

    private findCryptoEntry(
        certificate: CertificateVault,
        entryId: string
    ): GroupView["entries"][number] | undefined {
        const walk = (
            group: GroupView
        ): GroupView["entries"][number] | undefined => {
            for (const entry of group.entries) {
                if (entry.id === entryId) {
                    return entry;
                }
            }

            for (const child of group.groups) {
                const found = walk(child);

                if (found) {
                    return found;
                }
            }

            return undefined;
        };

        return walk(certificate.tree);
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

    private async checkForUpdates(): Promise<void> {
        const releasesUrl =
            "https://github.com/Marcus-Aprelius/sato-vscode/releases";

        const latest = await this.fetchLatestReleaseVersion();

        if (!latest) {
            const answer = await vscode.window.showWarningMessage(
                "SATO: failed to check updates.",
                "Open Releases"
            );

            if (answer === "Open Releases") {
                await this.openExternalUrl(releasesUrl);
            }

            return;
        }

        if (!isNewerVersion(latest, APP_VERSION)) {
            vscode.window.showInformationMessage("SATO is up to date.");
            return;
        }

        const answer = await vscode.window.showInformationMessage(
            `New version is available: ${latest}.`,
            "Open Update"
        );

        if (answer === "Open Update") {
            await this.openExternalUrl(releasesUrl);
        }
    }

    private async fetchLatestReleaseVersion(): Promise<string | undefined> {
        const url =
            "https://api.github.com/repos/Marcus-Aprelius/sato-vscode/releases/latest";

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "sato-vscode"
                }
            });

            if (!response.ok) {
                return undefined;
            }

            const data = await response.json() as {
                tag_name?: string;
                name?: string;
            };

            return normalizeVersion(
                data.tag_name || data.name || ""
            );
        } catch {
            return undefined;
        }
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

        if (!uri.authority) {
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

        if (
            !editor.document.db &&
            !editor.document.psafe &&
            !editor.document.certificate
        ) {
            return;
        }

        if (editor.document.certificate) {
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

        const webviewClientUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "dist",
            "webviewClient.js"
        );

        const logoUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "sato.png"
        );

        const toolbarLogoUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "sato_icon.jpg"
        );

        if (document.certificate) {
            if (initialLoad) {
                panel.webview.html = renderVault(
                    panel.webview,
                    document.uri,
                    document.certificate.tree,
                    document.certificate.stats,
                    settings,
                    logoUri,
                    toolbarLogoUri,
                    codiconsCssUri,
                    webviewClientUri,
                    APP_VERSION,
                    GIT_COMMIT,
                    document.certificate.selectedEntryId
                );
            } else {
                panel.webview.postMessage({
                    type: "vaultState",
                    state: {
                        tree: document.certificate.tree,
                        stats: document.certificate.stats,
                        settings,
                        selectedEntryId: document.certificate.selectedEntryId
                    }
                });
            }

            return;
        }

        if (document.psafe) {
            if (initialLoad) {
                panel.webview.html = renderVault(
                    panel.webview,
                    document.uri,
                    document.psafe.tree,
                    document.psafe.stats,
                    settings,
                    logoUri,
                    toolbarLogoUri,
                    codiconsCssUri,
                    webviewClientUri,
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
                toolbarLogoUri,
                codiconsCssUri,
                webviewClientUri,
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

function normalizeVersion(value: string): string {
    return value
        .trim()
        .replace(/^v/i, "");
}

function isNewerVersion(
    latest: string,
    current: string
): boolean {
    const latestParts = parseVersion(latest);
    const currentParts = parseVersion(current);

    for (let i = 0; i < 3; i++) {
        if (latestParts[i] > currentParts[i]) {
            return true;
        }

        if (latestParts[i] < currentParts[i]) {
            return false;
        }
    }

    return false;
}

function parseVersion(value: string): [number, number, number] {
    const parts = normalizeVersion(value)
        .split(".")
        .map((part) => Number.parseInt(part, 10));

    return [
        Number.isFinite(parts[0]) ? parts[0] : 0,
        Number.isFinite(parts[1]) ? parts[1] : 0,
        Number.isFinite(parts[2]) ? parts[2] : 0
    ];
}
