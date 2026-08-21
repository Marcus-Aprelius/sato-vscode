import { isExpiredCertificate } from "./format";
import { inspectPemCryptoFile } from "./inspectors/pemInspector";
import { inspectGpg, inspectGpgUnlocked } from "./inspectors/gpgInspector";
import { inspectJks, inspectJksUnlocked } from "./inspectors/jksInspector";
import { inspectPkcs12, inspectPkcs12Unlocked } from "./inspectors/pkcs12Inspector";

import type * as vscode from "vscode";
import type { GroupView, VaultStats } from "../vault";

import type {
    CertificateVault,
    CryptoContainerUnlockResult,
    CryptoFileInput,
    CryptoInspection
} from "./types";

export type {
    CertificateVault,
    CryptoContainerUnlockResult,
    CryptoFileInput,
    CryptoInspection
} from "./types";

const EXTENSIONS = [".crt", ".cer", ".der", ".pem", ".csr", ".key", ".pfx", ".p12", ".jks", ".jceks", ".gpg", ".pgp", ".asc", ".sig"];

export function isCertificateLikeUri(uri: vscode.Uri): boolean {
    const filePath = uri.fsPath.toLowerCase();

    return EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

export function isCertificateLikeFileName(fileName: string): boolean {
    const value = fileName.toLowerCase();

    return EXTENSIONS.some((ext) => value.endsWith(ext));
}

export function buildCertificateVault(
    uri: vscode.Uri,
    bytes: Uint8Array
): CertificateVault {
    return buildCertificateDirectoryVault(
        [
            {
                uri,
                bytes
            }
        ],
        uri
    );
}

export function buildCertificateDirectoryVault(
    files: CryptoFileInput[],
    selectedUri: vscode.Uri
): CertificateVault {
    const sortedFiles = files
        .slice()
        .sort((a, b) => fileNameOf(a.uri).localeCompare(fileNameOf(b.uri)));

    const privateKeysByEntryId: Record<string, string> = {};
    const filesByEntryId: Record<string, CryptoFileInput> = {};
    let selectedEntryId = "";

    const groups: GroupView[] = sortedFiles.map((file) => {
        const fileName = fileNameOf(file.uri);
        const entryId = cryptoEntryId(file.uri);
        const groupId = cryptoGroupId(file.uri);
        const lower = file.uri.fsPath.toLowerCase();

        filesByEntryId[entryId] = file;

        const text =
            lower.endsWith(".p12") ||
            lower.endsWith(".pfx") ||
            lower.endsWith(".jks") ||
            lower.endsWith(".gpg") ||
            lower.endsWith(".pgp") ||
            lower.endsWith(".sig")
                ? ""
                : Buffer.from(file.bytes).toString("utf8");

        const inspected = inspectCryptoFile(text, file.bytes, file.uri.fsPath);

        if (inspected.privateKeyPem) {
            privateKeysByEntryId[entryId] = inspected.privateKeyPem;
        }

        if (file.uri.fsPath === selectedUri.fsPath) {
            selectedEntryId = entryId;
        }

        return {
            id: groupId,
            parentId: "root",
            name: fileName,
            groups: [],
            entries: [
                {
                    id: entryId,
                    parentId: groupId,
                    title: fileName,
                    username: "",
                    url: "",
                    notes: inspected.values.Summary ?? "",
                    fields: Object.keys(inspected.values),
                    hasPassword: false,
                    passwordLength: 0,
                    weak: false,
                    expired: isExpiredCertificate(inspected.values),
                    values: inspected.values,
                    readOnly: true,
                    hasPrivateKey: inspected.privateKeyPem !== undefined
                }
            ]
        };
    });

    if (!selectedEntryId && groups.length > 0) {
        selectedEntryId = groups[0].entries[0].id;
    }

    const root: GroupView = {
        id: "root",
        parentId: null,
        name: "Crypto Files",
        groups,
        entries: []
    };

    const stats: VaultStats = {
        groups: groups.length + 1,
        entries: groups.length,
        duplicates: 0,
        expired: groups.reduce(
            (acc, group) => acc + (group.entries[0].expired ? 1 : 0),
            0
        ),
        emptyGroups: 0,
        weak: 0
    };

    return {
        tree: root,
        stats,
        selectedEntryId,
        privateKeyPem: selectedEntryId ? privateKeysByEntryId[selectedEntryId] : undefined,
        privateKeysByEntryId,
        filesByEntryId
    };
}

export function unlockCryptoContainer(
    vault: CertificateVault,
    entryId: string,
    password: string,
    privateKeyFile?: CryptoFileInput
): CryptoContainerUnlockResult {
    const file = vault.filesByEntryId?.[entryId];

    if (!file) {
        return {
            ok: false,
            message: "Crypto file is not available."
        };
    }

    const filePath = file.uri.fsPath;
    const lowerPath = filePath.toLowerCase();

    let inspected: CryptoInspection;

    if (
        lowerPath.endsWith(".p12") ||
        lowerPath.endsWith(".pfx")
    ) {
        inspected = inspectPkcs12Unlocked(
            file.bytes,
            filePath,
            password
        );
    } else if (
        lowerPath.endsWith(".jks") ||
        lowerPath.endsWith(".jceks")
    ) {
        inspected = inspectJksUnlocked(
            file.bytes,
            filePath,
            password
        );
    } else if (
        lowerPath.endsWith(".gpg") ||
        lowerPath.endsWith(".pgp")
    ) {
        if (!privateKeyFile) {
            return {
                ok: false,
                message: "OpenPGP private key file is required."
            };
        }

        inspected = inspectGpgUnlocked(
            file.bytes,
            filePath,
            password,
            privateKeyFile.bytes
        );
    } else {
        return {
            ok: false,
            message: "This file type does not require container unlock."
        };
    }

    if (inspected.values.Status !== "Unlocked") {
        return {
            ok: false,
            message:
                inspected.values.Summary ||
                "Failed to unlock encrypted file."
        };
    }

    const entry = findEntryInTree(vault.tree, entryId);

    if (!entry) {
        return {
            ok: false,
            message: "Crypto entry was not found."
        };
    }

    entry.notes = inspected.values.Summary ?? "";
    entry.fields = Object.keys(inspected.values);
    entry.values = inspected.values;
    entry.expired = isExpiredCertificate(inspected.values);
    entry.hasPrivateKey = inspected.privateKeyPem !== undefined;

    if (inspected.privateKeyPem) {
        if (!vault.privateKeysByEntryId) {
            vault.privateKeysByEntryId = {};
        }

        vault.privateKeysByEntryId[entryId] =
            inspected.privateKeyPem;
    }

    return {
        ok: true
    };
}

export function lockCryptoContainer(
    vault: CertificateVault,
    entryId: string
): CryptoContainerUnlockResult {
    const file = vault.filesByEntryId?.[entryId];

    if (!file) {
        return {
            ok: false,
            message: "Crypto file is not available."
        };
    }

    const filePath = file.uri.fsPath;
    const lowerPath = filePath.toLowerCase();

    let inspected: CryptoInspection;

    if (lowerPath.endsWith(".p12") || lowerPath.endsWith(".pfx")) {
        inspected = inspectPkcs12(file.bytes, filePath);
    } else if (
        lowerPath.endsWith(".jks") ||
        lowerPath.endsWith(".jceks")
    ) {
        inspected = inspectJks(
            file.bytes,
            filePath
        );
    } else if (
        lowerPath.endsWith(".gpg") ||
        lowerPath.endsWith(".pgp")
    ) {
        inspected = inspectGpg(file.bytes, filePath);
    } else {
        return {
            ok: false,
            message: "This file type is not a lockable crypto container."
        };
    }

    const entry = findEntryInTree(vault.tree, entryId);

    if (!entry) {
        return {
            ok: false,
            message: "Crypto entry was not found."
        };
    }

    entry.notes = inspected.values.Summary ?? "";
    entry.fields = Object.keys(inspected.values);
    entry.values = inspected.values;
    entry.expired = isExpiredCertificate(inspected.values);
    entry.hasPrivateKey = inspected.privateKeyPem !== undefined;

    if (vault.privateKeysByEntryId) {
        delete vault.privateKeysByEntryId[entryId];
    }

    if (vault.selectedEntryId === entryId) {
        vault.privateKeyPem = undefined;
    }

    return {
        ok: true
    };
}

function inspectCryptoFile(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const lowerPath = filePath.toLowerCase();

    if (
        lowerPath.endsWith(".pfx") ||
        lowerPath.endsWith(".p12")
    ) {
        return inspectPkcs12(bytes, filePath);
    }

    if (
        lowerPath.endsWith(".jks") ||
        lowerPath.endsWith(".jceks")
    ) {
        return inspectJks(bytes, filePath);
    }

    if (
        lowerPath.endsWith(".gpg") ||
        lowerPath.endsWith(".pgp") ||
        lowerPath.endsWith(".asc") ||
        lowerPath.endsWith(".sig")
    ) {
        return inspectGpg(bytes, filePath);
    }

    return inspectPemCryptoFile(
        text,
        bytes,
        filePath
    );
}

function cryptoEntryId(uri: vscode.Uri): string {
    return "crypto-entry:" + uri.fsPath;
}

function cryptoGroupId(uri: vscode.Uri): string {
    return "crypto-group:" + uri.fsPath;
}

function fileNameOf(uri: vscode.Uri): string {
    return uri.path.split("/").pop()
        ?? uri.fsPath.split(/[\\/]/).pop()
        ?? "crypto-file";
}

function findEntryInTree(
    group: GroupView,
    entryId: string
): GroupView["entries"][number] | undefined {
    for (const entry of group.entries) {
        if (entry.id === entryId) {
            return entry;
        }
    }

    for (const child of group.groups) {
        const found = findEntryInTree(child, entryId);

        if (found) {
            return found;
        }
    }

    return undefined;
}
