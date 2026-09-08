import { isExpiredCertificate } from "./format";
import { isSshPrivateKeyFilePath } from "./fileTypes";
import { inspectAge } from "./inspectors/ageInspector";
import { inspectPpk, inspectPpkUnlocked } from "./inspectors/ppkInspector";
import { inspectGpg, inspectGpgUnlocked } from "./inspectors/gpgInspector";
import { inspectJks, inspectJksUnlocked } from "./inspectors/jksInspector";
import { inspectPkcs8, inspectPkcs8Unlocked } from "./inspectors/pkcs8Inspector";
import { inspectPkcs12, inspectPkcs12Unlocked } from "./inspectors/pkcs12Inspector";
import { inspectPrivateKey, inspectPrivateKeyUnlocked } from "./inspectors/privateKeyInspector";
import { inspectSshPrivateKey, inspectSshPrivateKeyUnlocked } from "./inspectors/sshKeyInspector";

import type { GroupView } from "../vault";

import type {
    CertificateVault,
    CryptoContainerUnlockResult,
    CryptoFileInput,
    CryptoInspection
} from "./types";

export function unlockCryptoContainer(
    vault: CertificateVault,
    entryId: string,
    password: string,
    privateKeyFile?: CryptoFileInput
): CryptoContainerUnlockResult {
    const file = vault.filesByEntryId?.[entryId];

    if (!file) {
        return {ok: false, message: "Crypto file is not available."};
    }

    const filePath = file.uri.fsPath;
    const lowerPath = filePath.toLowerCase();

    let inspected: CryptoInspection;

    if (lowerPath.endsWith(".p12") || lowerPath.endsWith(".pfx")) {
        inspected = inspectPkcs12Unlocked(file.bytes, filePath, password);

    } else if (lowerPath.endsWith(".p8") || lowerPath.endsWith(".pk8")) {
        inspected = inspectPkcs8Unlocked(file.bytes, filePath, password);

    } else if (lowerPath.endsWith(".ppk")) {
        inspected = inspectPpkUnlocked(fileText(file), file.bytes, filePath, password);

    } else if (isSshPrivateKeyFilePath(filePath)) {
        inspected = inspectSshPrivateKeyUnlocked(fileText(file), file.bytes, filePath, password);

    } else if (lowerPath.endsWith(".pem") || lowerPath.endsWith(".key")) {
        inspected = inspectPrivateKeyUnlocked(fileText(file), file.bytes, filePath, password);

    } else if (lowerPath.endsWith(".jks") || lowerPath.endsWith(".jceks")) {
        inspected = inspectJksUnlocked(file.bytes, filePath, password);

    } else if (lowerPath.endsWith(".gpg") || lowerPath.endsWith(".pgp") || lowerPath.endsWith(".asc")) {
        if (!privateKeyFile) {
            return {ok: false, message: "OpenPGP private key file is required."};
        }

        inspected = inspectGpgUnlocked(file.bytes, filePath, password, privateKeyFile.bytes);
    } else {
        return {ok: false, message: "This file type does not require container unlock."};
    }

    if (inspected.values.Status !== "Unlocked") {
        return {ok: false, message: inspected.values.Summary || "Failed to unlock encrypted file."};
    }

    const entry = findEntryInTree(vault.tree, entryId);

    if (!entry) {
        return {ok: false, message: "Crypto entry was not found."};
    }

    applyInspection(entry, inspected);

    if (inspected.privateKeyPem) {
        if (!vault.privateKeysByEntryId) {
            vault.privateKeysByEntryId = {};
        }

        vault.privateKeysByEntryId[entryId] = inspected.privateKeyPem;

        if (vault.selectedEntryId === entryId) {
            vault.privateKeyPem = inspected.privateKeyPem;
        }
    }

    return {ok: true};
}

export function lockCryptoContainer(
    vault: CertificateVault,
    entryId: string
): CryptoContainerUnlockResult {
    const file = vault.filesByEntryId?.[entryId];

    if (!file) {
        return {ok: false, message: "Crypto file is not available."};
    }

    const filePath = file.uri.fsPath;
    const lowerPath = filePath.toLowerCase();

    let inspected: CryptoInspection;

    if (lowerPath.endsWith(".p12") || lowerPath.endsWith(".pfx") ) {
        inspected = inspectPkcs12(file.bytes, filePath);

    } else if (lowerPath.endsWith(".p8") || lowerPath.endsWith(".pk8")) {
        inspected = inspectPkcs8(file.bytes, filePath);

    } else if (lowerPath.endsWith(".ppk")) {
        inspected = inspectPpk(fileText(file), file.bytes, filePath);

    } else if (isSshPrivateKeyFilePath(filePath)) {
        inspected = inspectSshPrivateKey(fileText(file), file.bytes, filePath);

    } else if (lowerPath.endsWith(".pem") || lowerPath.endsWith(".key")) {
        inspected = inspectPrivateKey(fileText(file), file.bytes, filePath);

    } else if (lowerPath.endsWith(".jks") || lowerPath.endsWith(".jceks")) {
        inspected = inspectJks(file.bytes, filePath);

    } else if (lowerPath.endsWith(".gpg") || lowerPath.endsWith(".pgp") || lowerPath.endsWith(".asc")) {
        inspected = inspectGpg(file.bytes, filePath);

    } else {
        return {ok: false, message: "This file type is not a lockable crypto container."};
    }

    const entry = findEntryInTree(vault.tree, entryId);

    if (!entry) {
        return {ok: false, message: "Crypto entry was not found."};
    }

    applyInspection(entry, inspected);

    if (vault.privateKeysByEntryId) {
        delete vault.privateKeysByEntryId[entryId];
    }

    if (vault.selectedEntryId === entryId) {
        vault.privateKeyPem = undefined;
    }

    return {ok: true};
}

function applyInspection(
    entry: GroupView["entries"][number],
    inspected: CryptoInspection
): void {
    entry.notes = inspected.values.Summary ?? "";
    entry.fields = Object.keys(inspected.values);
    entry.values = inspected.values;
    entry.expired = isExpiredCertificate(inspected.values);
    entry.hasPrivateKey = inspected.privateKeyPem !== undefined;
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

function fileText(
    file: CryptoFileInput
): string {
    return Buffer.from(file.bytes).toString("utf8");
}
