import * as vscode from "vscode";
import * as kdbxweb from "kdbxweb";
import {
    applyEntryFields,
    buildTree,
    computeStats,
    duplicateEntry as duplicateEntryInVault,
    findEntry,
    findGroup,
    readEntryDetail,
    readEntryField,
    type EntryFields,
    type GroupView,
    type VaultStats
} from "./vault";
import { renderError, renderLocked, renderVault, type Settings } from "./webview";
import { APP_VERSION, GIT_COMMIT } from "./buildInfo";

interface KdbxDocument extends vscode.CustomDocument {
    db?: kdbxweb.Kdbx;
    credentials?: kdbxweb.Credentials;
}

type FromWebview =
    | { type: "unlock" }
    | { type: "reload" }
    | { type: "revealSecret"; entryId: string; field: string }
    | { type: "copySecret"; entryId: string; field: string }
    | { type: "copyText"; text: string }
    | { type: "getEntryDetail"; entryId: string }
    | { type: "createEntry"; groupId: string; fields: EntryFields }
    | { type: "updateEntry"; entryId: string; fields: EntryFields }
    | { type: "deleteEntry"; entryId: string }
    | { type: "duplicateEntry"; entryId: string }
    | { type: "createGroup"; parentId: string }
    | { type: "renameGroup"; groupId: string }
    | { type: "deleteGroup"; groupId: string }
    | { type: "updateSettings"; settings: Settings }
    | { type: "getDbInfo" };

interface ActiveEditor {
    document: KdbxDocument;
    panel: vscode.WebviewPanel;
    unlock: () => Promise<void>;
    lock: () => void;
    reload: () => Promise<void>;
    autoLockTimer?: ReturnType<typeof setTimeout>;
}

export class KdbxEditorProvider implements vscode.CustomReadonlyEditorProvider<KdbxDocument> {
    public static readonly viewType = "sato.kdbxViewer";

    private readonly editors = new Set<ActiveEditor>();
    // Last value copied to the clipboard, so timed clear doesn't clobber unrelated text.
    private lastClipboardCopy: string | undefined;

    constructor(private readonly context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (!e.affectsConfiguration("sato")) {
                    return;
                }
                const settings = this.readSettings();
                for (const ed of this.editors) {
                    ed.panel.webview.postMessage({ type: "settingsUpdated", settings });
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

    async openCustomDocument(uri: vscode.Uri): Promise<KdbxDocument> {
        const doc: KdbxDocument = {
            uri,
            dispose: () => {
                doc.db = undefined;
                doc.credentials = undefined;
            }
        };
        return doc;
    }

    async resolveCustomEditor(
        document: KdbxDocument,
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
            let bytes: Uint8Array;
            try {
                bytes = await vscode.workspace.fs.readFile(document.uri);
            } catch (err) {
                panel.webview.html = renderError(panel.webview, `Failed to read file: ${describeError(err)}`);
                return;
            }

            panel.webview.html = renderLocked(panel.webview, document.uri);

            const result = await this.unlockWithRetry(document.uri, bytes);
            if (!result) {
                panel.dispose();
                return;
            }
            document.db = result.db;
            document.credentials = result.credentials;
            this.renderState(document, panel, true);
            this.scheduleAutoLock(editor);
        };

        editor.lock = () => {
            this.clearAutoLock(editor);
            document.db = undefined;
            document.credentials = undefined;
            panel.webview.html = renderLocked(panel.webview, document.uri);
        };

        editor.reload = async () => {
            this.clearAutoLock(editor);
            document.db = undefined;
            document.credentials = undefined;
            await editor.unlock();
        };

        this.editors.add(editor);

        panel.webview.onDidReceiveMessage((msg: FromWebview) => {
            this.scheduleAutoLock(editor);
            void this.handleMessage(document, panel, msg, editor.reload);
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
            this.editors.delete(editor);
        });

        await editor.unlock();
    }

    private async handleMessage(
        document: KdbxDocument,
        panel: vscode.WebviewPanel,
        msg: FromWebview,
        reload: () => Promise<void>
    ): Promise<void> {
        if (msg.type === "unlock" || msg.type === "reload") {
            await reload();
            return;
        }

        if (msg.type === "updateSettings") {
            const cfg = vscode.workspace.getConfiguration("sato");
            await cfg.update("autoLockTimeout", msg.settings.autoLockTimeout, vscode.ConfigurationTarget.Global);
            await cfg.update("clipboardClearTimeout", msg.settings.clipboardClearTimeout, vscode.ConfigurationTarget.Global);
            await cfg.update("passwordGeneratorLength", msg.settings.passwordGeneratorLength, vscode.ConfigurationTarget.Global);
            await cfg.update("confirmBeforeDelete", msg.settings.confirmBeforeDelete, vscode.ConfigurationTarget.Global);
            await cfg.update("showPasswordsByDefault", msg.settings.showPasswordsByDefault, vscode.ConfigurationTarget.Global);
            await cfg.update("showStatusBar", msg.settings.showStatusBar, vscode.ConfigurationTarget.Global);
            vscode.window.setStatusBarMessage("SATO: settings saved", 2000);
            return;
        }

        const db = document.db;
        if (!db) {
            return;
        }
        const settings = this.readSettings();

        switch (msg.type) {
            case "copySecret": {
                const value = readEntryField(db, msg.entryId, msg.field);
                if (value === undefined) {
                    return;
                }
                await this.copyToClipboard(value, `SATO: copied ${msg.field}`, settings);
                return;
            }
            case "copyText": {
                if (!msg.text) {
                    return;
                }
                await this.copyToClipboard(msg.text, "SATO: password copied", settings);
                return;
            }
            case "revealSecret": {
                const value = readEntryField(db, msg.entryId, msg.field);
                if (value === undefined) {
                    return;
                }
                panel.webview.postMessage({
                    type: "secretRevealed",
                    entryId: msg.entryId,
                    field: msg.field,
                    value
                });
                return;
            }
            case "getEntryDetail": {
                const detail = readEntryDetail(db, msg.entryId);
                if (detail) {
                    panel.webview.postMessage({ type: "entryDetail", detail });
                }
                return;
            }
            case "getDbInfo": {
                const info = await this.collectDbInfo(document, db);
                panel.webview.postMessage({ type: "dbInfo", info });
                return;
            }
            case "createEntry": {
                const group = findGroup(db, msg.groupId);
                if (!group) {
                    return;
                }
                const entry = db.createEntry(group);
                applyEntryFields(entry, msg.fields);
                await this.persist(document, panel, `Created “${msg.fields.title}”`);
                return;
            }
            case "updateEntry": {
                const found = findEntry(db, msg.entryId);
                if (!found) {
                    return;
                }
                applyEntryFields(found.entry, msg.fields);
                await this.persist(document, panel, `Updated “${msg.fields.title}”`);
                return;
            }
            case "deleteEntry": {
                const found = findEntry(db, msg.entryId);
                if (!found) {
                    return;
                }
                const title = readEntryField(db, msg.entryId, "Title") || "(untitled)";
                if (settings.confirmBeforeDelete) {
                    const answer = await vscode.window.showWarningMessage(
                        `Delete entry “${title}”?`,
                        { modal: true },
                        "Delete"
                    );
                    if (answer !== "Delete") {
                        return;
                    }
                }
                db.remove(found.entry);
                await this.persist(document, panel, `Deleted “${title}”`);
                return;
            }
            case "duplicateEntry": {
                const copy = duplicateEntryInVault(db, msg.entryId);
                if (!copy) {
                    return;
                }
                await this.persist(document, panel, "Entry duplicated");
                return;
            }
            case "createGroup": {
                const parent = findGroup(db, msg.parentId);
                if (!parent) {
                    return;
                }
                const name = await vscode.window.showInputBox({
                    title: "SATO – new folder",
                    prompt: `Folder name (parent: ${parent.name ?? ""})`,
                    validateInput: (v) => (v.trim() ? undefined : "Name required")
                });
                if (!name) {
                    return;
                }
                db.createGroup(parent, name.trim());
                await this.persist(document, panel, `Created folder “${name.trim()}”`);
                return;
            }
            case "renameGroup": {
                const group = findGroup(db, msg.groupId);
                if (!group) {
                    return;
                }
                if (!group.parentGroup) {
                    vscode.window.showWarningMessage("SATO: cannot rename the root group");
                    return;
                }
                const name = await vscode.window.showInputBox({
                    title: "SATO – rename folder",
                    prompt: "New folder name",
                    value: group.name ?? "",
                    validateInput: (v) => (v.trim() ? undefined : "Name required")
                });
                if (!name || name.trim() === group.name) {
                    return;
                }
                group.name = name.trim();
                group.times.update();
                await this.persist(document, panel, `Renamed folder to “${name.trim()}”`);
                return;
            }
            case "deleteGroup": {
                const group = findGroup(db, msg.groupId);
                if (!group) {
                    return;
                }
                if (!group.parentGroup) {
                    vscode.window.showWarningMessage("SATO: cannot delete the root group");
                    return;
                }
                const label = group.name ?? "(unnamed)";
                if (settings.confirmBeforeDelete) {
                    const answer = await vscode.window.showWarningMessage(
                        `Delete folder “${label}” and all its contents?`,
                        { modal: true },
                        "Delete"
                    );
                    if (answer !== "Delete") {
                        return;
                    }
                }
                db.remove(group);
                await this.persist(document, panel, `Deleted folder “${label}”`);
                return;
            }
        }
    }

    private async copyToClipboard(value: string, message: string, settings: Settings): Promise<void> {
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
        if (!editor.document.db) {
            return;
        }
        const minutes = this.readSettings().autoLockTimeout;
        if (minutes <= 0) {
            return;
        }
        editor.autoLockTimer = setTimeout(() => {
            if (editor.document.db) {
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

    private async collectDbInfo(document: KdbxDocument, db: kdbxweb.Kdbx): Promise<Record<string, unknown>> {
        let fileSize = 0;
        try {
            const stat = await vscode.workspace.fs.stat(document.uri);
            fileSize = stat.size;
        } catch {
            // ignore
        }
        let groupCount = 0;
        let entryCount = 0;
        const walk = (g: kdbxweb.KdbxGroup): void => {
            groupCount++;
            entryCount += g.entries.length;
            for (const c of g.groups) {
                walk(c);
            }
        };
        walk(db.getDefaultGroup());

        const header = db.header as unknown as { versionMajor?: number; versionMinor?: number } | undefined;
        const version = header?.versionMajor !== undefined
            ? `${header.versionMajor}.${header.versionMinor ?? 0}`
            : "unknown";
        const meta = db.meta as unknown as {
            name?: string;
            desc?: string;
            generator?: string;
            recycleBinEnabled?: boolean;
        } | undefined;

        return {
            name: meta?.name ?? "",
            desc: meta?.desc ?? "",
            generator: meta?.generator ?? "",
            version,
            filePath: document.uri.fsPath,
            fileSize,
            groupCount,
            entryCount,
            recycleBinEnabled: meta?.recycleBinEnabled ?? false
        };
    }

    private async persist(
        document: KdbxDocument,
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
            await vscode.window.showErrorMessage(`SATO: save failed – ${describeError(err)}`);
        }
        this.renderState(document, panel, false);
    }

    private renderState(
        document: KdbxDocument,
        panel: vscode.WebviewPanel,
        initialLoad: boolean
    ): void {
        const db = document.db;
        if (!db) {
            return;
        }
        const tree: GroupView = buildTree(db);
        const stats: VaultStats = computeStats(db);
        const settings = this.readSettings();
        if (initialLoad) {
            const codiconsCssUri = vscode.Uri.joinPath(this.context.extensionUri, "assets", "codicons", "codicon.css");
            const logoUri = vscode.Uri.joinPath(
                this.context.extensionUri,
                "assets",
                "sato2.png"
            );

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
            panel.webview.postMessage({ type: "vaultState", state: { tree, stats, settings } });
        }
    }

    private async unlockWithRetry(
        uri: vscode.Uri,
        bytes: Uint8Array
    ): Promise<{ db: kdbxweb.Kdbx; credentials: kdbxweb.Credentials } | undefined> {
        const name = uri.path.split("/").pop() ?? "vault.kdbx";

        for (let attempt = 0; attempt < 3; attempt++) {
            const password = await vscode.window.showInputBox({
                title: `SATO – unlock ${name}`,
                prompt: attempt === 0
                    ? "Enter master password"
                    : "Wrong password. Try again",
                password: true,
                ignoreFocusOut: true
            });

            if (password === undefined) {
                return undefined;
            }

            const credentials = new kdbxweb.Credentials(
                kdbxweb.ProtectedValue.fromString(password)
            );

            try {
                const db = await kdbxweb.Kdbx.load(toArrayBuffer(bytes), credentials);
                return { db, credentials };
            } catch (err) {
                const kdbxErr = err as { code?: string; message?: string };
                if (kdbxErr.code === "InvalidKey") {
                    continue;
                }
                await vscode.window.showErrorMessage(
                    `SATO: failed to open vault – ${describeError(err)}`
                );
                return undefined;
            }
        }

        await vscode.window.showErrorMessage("SATO: too many failed unlock attempts");
        return undefined;
    }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}

function describeError(err: unknown): string {
    if (err instanceof Error) {
        return err.message;
    }
    return String(err);
}
