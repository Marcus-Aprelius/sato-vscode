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
    | { type: "selectCryptoConversionSource"; }
    | { type: "prepareCryptoConversion"; entryId: string; initialTab?: "convert" | "extract";}
    | { type: "selectCryptoConversionDirectory"; initialPath: string; }
    | { type: "convertCryptoFile"; entryId: string; outputFormat:
        | "PEM" | "DER" | "RFC4716" | "PKCS8" | "RSA_PKCS1_PEM" | "RSA_PKCS1_DER"
        | "RSA_PKCS8_PEM" | "RSA_PKCS8_DER" | "RSA_SPKI_PEM" | "RSA_SPKI_DER"
        | "RSA_PUBLIC_PKCS1_PEM" | "RSA_PUBLIC_PKCS1_DER"| "EC_SEC1_PEM" | "EC_SEC1_DER"
        | "EC_PKCS8_PEM" | "EC_PKCS8_DER" | "EC_SPKI_PEM" | "EC_SPKI_DER"
        | "SPC_CMS_PEM" | "SPC_CERTIFICATES_PEM" | "SPC_CERTIFICATES_DER" | "SPC_CERTIFICATE_CHAIN_P7B";
               outputFilePath: string; outputFileName: string;}
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
