import * as vscode from "vscode";
import * as kdbxweb from "kdbxweb";

import type { VaultAdapterRuntime } from "./index";
import type { FromWebview, VaultDocument } from "../types";

import {
    applyEntryFields,
    duplicateEntry as duplicateEntryInVault,
    findEntry,
    findGroup,
    readEntryDetail,
    readEntryField
} from "../vault";

export async function unlockKdbxVault(
    document: VaultDocument,
    bytes: Uint8Array,
    password: string
): Promise<void> {
    const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password));

    const db = await kdbxweb.Kdbx.load(toArrayBuffer(bytes), credentials);

    document.db = db;
    document.credentials = credentials;
    document.psafe = undefined;
}

export async function handleKdbxMessage(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    msg: FromWebview,
    runtime: VaultAdapterRuntime
): Promise<void> {
    const db = document.db;

    if (!db) {
        return;
    }

    const settings = runtime.readSettings();

    switch (msg.type) {
        case "copySecret": {
            const value = readEntryField(db, msg.entryId, msg.field);

            if (value === undefined) {
                return;
            }

            await runtime.copyToClipboard(value, `SATO: copied ${msg.field}`, settings);

            return;
        }

        case "copyText": {
            if (!msg.text) {
                return;
            }

            await runtime.copyToClipboard(msg.text, "SATO: password copied", settings);

            return;
        }

        case "revealSecret": {
            const value = readEntryField(db, msg.entryId, msg.field);

            if (value === undefined) {
                return;
            }

            panel.webview.postMessage({type: "secretRevealed", entryId: msg.entryId, field: msg.field, value});

            return;
        }

        case "getEntryDetail": {
            const detail = readEntryDetail(db, msg.entryId);

            if (detail) {
                panel.webview.postMessage({type: "entryDetail", detail});
            }

            return;
        }

        case "getDbInfo": {
            const info = await collectKdbxDbInfo(document, db);

            panel.webview.postMessage({type: "dbInfo", info});

            return;
        }

        case "createEntry": {
            const group = findGroup(db, msg.groupId);

            if (!group) {
                return;
            }

            const entry = db.createEntry(group);
            applyEntryFields(entry, msg.fields);

            await runtime.persist(document, panel, `Created “${msg.fields.title}”`);

            return;
        }

        case "updateEntry": {
            const found = findEntry(db, msg.entryId);

            if (!found) {
                return;
            }

            applyEntryFields(found.entry, msg.fields);

            await runtime.persist(document, panel, `Updated “${msg.fields.title}”`);

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

            await runtime.persist(document, panel, `Deleted “${title}”`);

            return;
        }

        case "duplicateEntry": {
            const copy = duplicateEntryInVault(db, msg.entryId);

            if (!copy) {
                return;
            }

            await runtime.persist(document, panel, "Entry duplicated");

            return;
        }

        case "createGroup": {
            const parent = findGroup(db, msg.parentId);

            if (!parent) {
                return;
            }

            const name = await vscode.window.showInputBox({
                title: "SATO - new folder",
                prompt: `Folder name (parent: ${parent.name ?? ""})`,
                validateInput: (v) => (v.trim() ? undefined : "Name required")
            });

            if (!name) {
                return;
            }

            db.createGroup(parent, name.trim());

            await runtime.persist(document, panel, `Created folder “${name.trim()}”`);

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
                title: "SATO - rename folder",
                prompt: "New folder name",
                value: group.name ?? "",
                validateInput: (v) => (v.trim() ? undefined : "Name required")
            });

            if (!name || name.trim() === group.name) {
                return;
            }

            group.name = name.trim();
            group.times.update();

            await runtime.persist(document, panel, `Renamed folder to “${name.trim()}”`);

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

            await runtime.persist(document, panel, `Deleted folder “${label}”`);

            return;
        }
    }
}

export async function collectKdbxDbInfo(
    document: VaultDocument,
    db: kdbxweb.Kdbx
): Promise<Record<string, unknown>> {
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

    const header = db.header as unknown as {
        versionMajor?: number;
        versionMinor?: number;
    } | undefined;

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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}
