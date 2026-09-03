import type * as vscode from "vscode";
import type * as kdbxweb from "kdbxweb";

import type { Settings } from "./webview";
import type { PsafeVault } from "./psafe";
import type { EntryFields } from "./vault";
import type { ImportedVault } from "./importedVault";
import type { CertificateVault } from "./certificates";

export interface VaultDocument extends vscode.CustomDocument {
    db?: kdbxweb.Kdbx;
    credentials?: kdbxweb.Credentials;
    psafe?: PsafeVault;
    certificate?: CertificateVault;
    importedVault?: ImportedVault;
}

export type FromWebview =
    | { type: "unlock" }
    | { type: "reload" }
    | { type: "lock" }
    | { type: "openDb" }
    | { type: "openDirectory" }
    | { type: "openWithDefaultEditor"; }
    | { type: "checkUpdate" }
    | { type: "unlockWithPassword"; password: string; }
    | { type: "prepareCryptoUnlock"; entryId: string; }
    | { type: "selectOpenPgpPrivateKey"; entryId: string; }
    | { type: "unlockCryptoContainer"; entryId: string; password: string; privateKeyPath?: string; }
    | { type: "lockCryptoContainer"; entryId: string; }
    | { type: "revealSecret"; entryId: string; field: string; }
    | { type: "revealPrivateKey"; entryId?: string; }
    | { type: "copySecret"; entryId: string; field: string; }
    | { type: "copyText"; text: string; }
    | { type: "openUrl"; url: string; }
    | { type: "getEntryDetail"; entryId: string; }
    | { type: "createEntry"; groupId: string; fields: EntryFields; }
    | { type: "updateEntry"; entryId: string; fields: EntryFields; }
    | { type: "deleteEntry"; entryId: string; }
    | { type: "duplicateEntry"; entryId: string; }
    | { type: "createGroup"; parentId: string; }
    | { type: "renameGroup"; groupId: string; }
    | { type: "deleteGroup"; groupId: string; }
    | { type: "updateSettings"; settings: Settings; }
    | { type: "getDbInfo"; entryId?: string | null; };

export interface ActiveEditor {
    document: VaultDocument;
    panel: vscode.WebviewPanel;
    unlock: () => Promise<void>;
    lock: () => void;
    reload: () => Promise<void>;
    autoLockTimer?: ReturnType<typeof setTimeout>;
}
