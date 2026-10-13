import * as path from "path";
import * as vscode from "vscode";
import { isOpenPgpEncryptedFile } from "./uriTypes";
import { prepareCryptoUnlock } from "./dependencyChecks";
import { collectCryptoFileInfo, findCryptoEntry } from "./cryptoFiles";

import type { FromWebview, VaultDocument } from "../types";
import type { Settings } from "../webview";
import { describeError } from "../utils/errors";

import {
    buildCertificateDirectoryVault,
    certificateOutputFormat,
    convertCertificate,
    convertOpenSshPublicKey,
    convertRsaKey,
    isRsaKeyOutputFormat,
    lockCryptoContainer,
    openSshPublicKeyOutputFormats,
    rsaKeyOutputFormats,
    unlockCryptoContainer,
    convertEcKey,
    isEcKeyOutputFormat,
    ecKeyOutputFormats,
    convertSpc,
    spcOutputFormats,
    isSpcOutputFormat,
    changePrivateKeyPassword,
    changeSshKeyPassword,
    changePpkPassword,
    changeJksPassword,
    changePkcs12Password,
    changeAgePassword,
    changeGpgPassword,
    changeLuksPassword,
    type SpcOutputFormat,
    type AvailableOutputFormat,
    type CertificateVault,
    type CryptoFileInput,
    type CryptoOutputFormat
} from "../certificates";

export interface CryptoMessageRuntime {
    reload: () => Promise<void>;
    readSettings: () => Settings;
    copyToClipboard: (value: string, message: string, settings: Settings) => Promise<void>;
}

const conversionSources = new WeakMap<vscode.WebviewPanel, CertificateVault>();

export async function handleCryptoMessage(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    msg: FromWebview,
    runtime: CryptoMessageRuntime
): Promise<boolean> {
    if (msg.type === "selectOpenPgpPrivateKey") {
        await selectOpenPgpPrivateKey(document, panel, msg.entryId);
        return true;
    }

    if (msg.type === "prepareCryptoUnlock") {
        prepareCryptoContainerUnlock(document, panel, msg.entryId);
        return true;
    }

    if (msg.type === "selectCryptoConversionDirectory") {
        const initialPath = msg.initialPath.trim();

        const selected =
            await vscode.window.showOpenDialog({
                title: "SATO - Select Output Directory",
                defaultUri: initialPath ? vscode.Uri.file(initialPath) : undefined,
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false
            });

        const directoryUri = selected?.[0];

        if (!directoryUri) {
            return true;
        }

        panel.webview.postMessage({type: "cryptoConversionDirectorySelected", filePath: directoryUri.fsPath});
        return true;
    }

        if (msg.type === "selectCryptoConversionSource") {
            const selected =
                await vscode.window.showOpenDialog({
                    title: "SATO - Select File to Convert",
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {"Supported conversion sources": ["crt", "cer", "der", "pem", "pub", "rsa", "ec","spc"]}
                });

            const sourceUri = selected?.[0];

            if (!sourceUri) {
                return true;
            }

            let bytes: Uint8Array;

            try {
                bytes =await vscode.workspace.fs.readFile(sourceUri);

            } catch (err) {
                vscode.window.showErrorMessage(`SATO: failed to read conversion source - ${describeError(err)}`);
                return true;
            }

            const sourceFile: CryptoFileInput = {uri: sourceUri, bytes};
            const sourceVault = buildCertificateDirectoryVault([sourceFile], sourceUri);
            const sourceEntryId = sourceVault.selectedEntryId;

            if (!sourceEntryId) {
                vscode.window.showInformationMessage("SATO: the selected file cannot be converted.");
                return true;
            }

            conversionSources.set(panel, sourceVault);
            prepareCryptoConversion(sourceVault, panel, sourceEntryId);

            return true;
        }

    const certificate = document.certificate;

    if (!certificate) {
        return false;
    }

    if (msg.type === "prepareCryptoConversion") {
        conversionSources.delete(panel);
        prepareCryptoConversion( certificate, panel, msg.entryId, msg.initialTab || "convert");

        return true;
    }

    if (msg.type === "convertCryptoFile") {
        const conversionCertificate = conversionSources.get(panel) || certificate;
        await convertCryptoFile(conversionCertificate, msg.entryId, msg.outputFormat, msg.outputFilePath, msg.outputFileName);
        conversionSources.delete(panel);

        return true;
    }

    if (msg.type === "getDbInfo") {
        const info = collectCryptoFileInfo(certificate, msg.entryId || certificate.selectedEntryId);
        panel.webview.postMessage({type: "dbInfo", info});

        return true;
    }

    if (msg.type === "unlockCryptoContainer") {
        const encryptedFile = certificate.filesByEntryId?.[msg.entryId];
        let privateKeyFile: CryptoFileInput | undefined;

        if (encryptedFile && isOpenPgpEncryptedFile(encryptedFile.uri)) {
            const privateKeyPath = msg.privateKeyPath?.trim();

            if (!privateKeyPath) {
                panel.webview.postMessage({
                    type: "cryptoContainerUnlockFailed",
                    entryId: msg.entryId,
                    message: "Select an OpenPGP private key file."
                });

                return true;
            }

            const privateKeyUri = vscode.Uri.file(privateKeyPath);

            try {
                privateKeyFile = {uri: privateKeyUri, bytes: await vscode.workspace.fs.readFile(privateKeyUri)};

            } catch (err) {
                panel.webview.postMessage({
                    type: "cryptoContainerUnlockFailed",
                    entryId: msg.entryId,
                    message: `Failed to read private key: ${describeError(err)}`
                });

                return true;
            }
        }

        const result = unlockCryptoContainer(certificate, msg.entryId, msg.password, privateKeyFile);

        if (!result.ok) {
            panel.webview.postMessage({
                type: "cryptoContainerUnlockFailed",
                entryId: msg.entryId,
                message: result.message || "Failed to unlock encrypted file."
            });

            return true;
        }

        postCertificateState(certificate, panel, runtime.readSettings(), msg.entryId);

        vscode.window.setStatusBarMessage(
            isOpenPgpEncryptedFile(encryptedFile?.uri)
                ? "SATO: OpenPGP message decrypted"
                : "SATO: crypto container unlocked", 2500
        );

        return true;
    }

    if (msg.type === "lockCryptoContainer") {
        const result = lockCryptoContainer(certificate, msg.entryId);

        if (!result.ok) {
            panel.webview.postMessage({
                type: "cryptoContainerUnlockFailed",
                entryId: msg.entryId,
                message: result.message || "Failed to lock crypto container."
            });

            return true;
        }

        postCertificateState(certificate, panel, runtime.readSettings(), msg.entryId);
        vscode.window.setStatusBarMessage("SATO: crypto container locked", 2500);

        return true;
    }

    if (msg.type === "copyText") {
        await runtime.copyToClipboard(msg.text, "SATO: copied text", runtime.readSettings());
        return true;
    }

    if (msg.type === "revealPrivateKey") {
        
        const entryId = msg.entryId || certificate.selectedEntryId;
        const privateKeyPem = certificate.privateKeysByEntryId?.[entryId];

        if (privateKeyPem) {
            panel.webview.postMessage({type: "privateKeyRevealed", entryId, value: privateKeyPem});
        }

        return true;
    }

    if (msg.type === "preparePrivateKeyPasswordChange") {
        const entry = findCryptoEntry(certificate, msg.entryId);
        const file = certificate.filesByEntryId?.[msg.entryId];

        if (!entry || !file) {
            vscode.window.showWarningMessage("SATO: private key file is not available.");
            return true;
        }

        if (!isPasswordEditablePrivateKey(entry, file.uri.fsPath)) {
            vscode.window.showWarningMessage("SATO: password management is not available for this file.");
            return true;
        }

        const encryption = (entry.values?.Encryption || "").trim().toLowerCase();
        const summary = entry.values?.Summary || "";
        const protection = (entry.values?.Protection || "").trim().toLowerCase();
        const ageFile = entry.values?.Type === "age Encrypted File";

        const encrypted = ageFile || entry.values?.Status === "Locked" ||
            protection.includes("password") || protection === "passphrase" ||
            (encryption !== "" && encryption !== "none") ||
            (/\bencrypted\b/i.test(summary) && !/\bunencrypted\b/i.test(summary));

        const passwordKind = entry.values?.Type === "age Encrypted File" ? "age" : entry.values?.Type === "PKCS#12 Container" ? "pkcs12"
                : entry.values?.Type === "Java KeyStore" || entry.values?.Type === "Java Cryptography Extension KeyStore" ? "keystore" : "privateKey";

        panel.webview.postMessage({
            type: "openPrivateKeyPasswordChange",
            entryId: msg.entryId,
            mode: encrypted ? "change" : "set",
            passwordKind
        });

        return true;
    }

    if (msg.type === "changePrivateKeyPassword") {
        await updatePrivateKeyPassword(document, panel, msg.entryId, msg.currentPassword, msg.newPassword, runtime);
        return true;
    }

    if (msg.type === "deletePrivateKeyPassword") {
        await updatePrivateKeyPassword(document, panel, msg.entryId, msg.currentPassword, undefined, runtime);
        return true;
    }

    return true;
}

async function selectOpenPgpPrivateKey(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    entryId: string
): Promise<void> {
    const encryptedFile = document.certificate ?.filesByEntryId?.[entryId];

    if (!encryptedFile) {
        panel.webview.postMessage({
            type: "cryptoContainerUnlockFailed",
            entryId,
            message: "Encrypted OpenPGP file is not available."
        });

        return;
    }

    const selected = await vscode.window.showOpenDialog({
        title: "SATO - Select OpenPGP Private Key",
        defaultUri: vscode.Uri.file(path.dirname(encryptedFile.uri.fsPath)),
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {"OpenPGP private keys": ["asc", "gpg", "pgp"], "All files": ["*"]}
    });

    const privateKeyUri = selected?.[0];

    if (!privateKeyUri) {
        return;
    }

    panel.webview.postMessage({type: "openPgpPrivateKeySelected", entryId, filePath: privateKeyUri.fsPath});
}

function prepareCryptoContainerUnlock(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    entryId: string
): void {
    const file = document.certificate ?.filesByEntryId?.[entryId];

    if (!file) {
        vscode.window.showWarningMessage("SATO: encrypted file is not available.");
        return;
    }

    if (!prepareCryptoUnlock(file.uri.fsPath)) {
        return;
    }

    panel.webview.postMessage({type: "cryptoUnlockReady", entryId});
}

function postCertificateState(
    certificate: NonNullable<VaultDocument["certificate"]>,
    panel: vscode.WebviewPanel,
    settings: Settings,
    selectedEntryId: string
): void {
    panel.webview.postMessage({
        type: "vaultState",
        state: {
            tree: certificate.tree,
            stats: certificate.stats,
            settings,
            selectedEntryId,
            readOnlyVault: true,
            vaultFormat: "files",
            archives: certificate.supportedFiles.map(file => ({
                fileName: file.fileName,
                filePath: file.filePath,
                category: file.category,
                selected: certificate.filesByEntryId?.[selectedEntryId]?.uri.fsPath === file.filePath
            })),
            selectedArchivePath: certificate.filesByEntryId?.[selectedEntryId]?.uri.fsPath
        }
    });
}

function prepareCryptoConversion(
    certificate: NonNullable<VaultDocument["certificate"]>,
    panel: vscode.WebviewPanel,
    entryId: string,
    initialTab: "convert" | "extract" = "convert"
): void {
    const entry = findCryptoEntry(certificate, entryId);
    const file = certificate.filesByEntryId?.[entryId];

    if (!entry || !file) {
        vscode.window.showWarningMessage("SATO: crypto file is not available.");

        return;
    }

    const values = entry.values || {};

    let sourceFormat: string;
    let outputFormat: CryptoOutputFormat;
    let availableOutputFormats: AvailableOutputFormat[];

    if (values.Type === "X.509 Certificate") {
        sourceFormat = values.Encoding || "";

        if (sourceFormat !== "PEM" && sourceFormat !== "DER") {
            vscode.window.showInformationMessage("SATO: this certificate encoding is not supported for conversion.");
            return;
        }

        outputFormat = certificateOutputFormat(sourceFormat);
        availableOutputFormats = [{value: outputFormat, label: outputFormat, extension: outputFormat === "PEM" ? ".pem" : ".der"}];

    } else if (values.Type === "OpenSSH Public Key") {
        sourceFormat = "OpenSSH";
        availableOutputFormats = openSshPublicKeyOutputFormats(values["Key type"] || "");

        const firstFormat = availableOutputFormats[0];

        if (!firstFormat) {
            vscode.window.showInformationMessage("SATO: no output formats are available for this public key.");
            return;
        }

        outputFormat = firstFormat.value;
    } else if (values.Type === "RSA Private Key" || values.Type === "RSA Public Key" || (values.Type === "Private Key" && values.Algorithm === "RSA")) {

        sourceFormat = [values.Encoding, values.Format].filter(Boolean).join(" ");
        const keyKind = values.Type === "RSA Public Key" ? "public" : "private";

        availableOutputFormats = rsaKeyOutputFormats(keyKind);
        const currentFormat = currentRsaOutputFormat(values.Encoding || "", values.Format || "", keyKind);

        if (currentFormat) {
            availableOutputFormats = availableOutputFormats.filter((format) => format.value !== currentFormat);
        }

        const firstFormat = availableOutputFormats[0];

        if (!firstFormat) {
            vscode.window.showInformationMessage("SATO: no output formats are available for this RSA key.");
            return;
        }

        outputFormat = firstFormat.value;

    } else if (values.Type === "EC Private Key" || values.Type === "EC Public Key") {

        sourceFormat = [values.Encoding, values.Format].filter(Boolean).join(" ");
        const keyKind = values.Type === "EC Public Key" ? "public" : "private";

        availableOutputFormats = ecKeyOutputFormats(keyKind);
        const currentFormat = currentEcOutputFormat(values.Encoding || "", values.Format || "", keyKind);

        if (currentFormat) {
            availableOutputFormats = availableOutputFormats.filter((format) => format.value !== currentFormat);
        }

        const firstFormat = availableOutputFormats[0];

        if (!firstFormat) {
            vscode.window.showInformationMessage("SATO: no output formats are available for this EC key.");
            return;
        }

        outputFormat = firstFormat.value;

    } else if (values.Type === "Authenticode Certificate Container") {
        sourceFormat = values.Encoding || "DER";
        availableOutputFormats = spcOutputFormats();
        const firstFormat = availableOutputFormats[0];

        if (!firstFormat) {
            vscode.window.showInformationMessage("SATO: no output formats are available for this SPC container.");
            return;
        }

        outputFormat = firstFormat.value;

    } else {
        vscode.window.showInformationMessage("SATO: conversion is not supported for this file type.");
        return;
    }

    const outputFormats = availableOutputFormats.map((format) => ({...format, outputFileName: convertedFileName(file.uri.fsPath, format.value)}));

    panel.webview.postMessage({
        type: "cryptoConversionReady",
        conversion: {
            entryId,
            initialTab,
            fileName: path.basename(file.uri.fsPath),
            filePath: file.uri.fsPath,
            type: values.Type || "Crypto file",
            sourceFormat,
            outputFormat,
            availableOutputFormats: outputFormats,
            outputFileName: convertedFileName(file.uri.fsPath, outputFormat),
            subject: values.Subject || "",
            issuer: values.Issuer || "",
            validTo: values["Valid to"] || "",
            sha256: values["SHA-256"] || ""
        }
    });
}

async function convertCryptoFile(
    certificate: NonNullable<VaultDocument["certificate"]>,
    entryId: string,
    outputFormat: CryptoOutputFormat,
    outputFilePath: string,
    requestedFileName: string
): Promise<void> {
    const entry = findCryptoEntry(certificate, entryId);
    const file = certificate.filesByEntryId?.[entryId];

    if (!entry || !file) {
        vscode.window.showErrorMessage("SATO: crypto file is not available.");
        return;
    }

    try {
        let converted;

        if (entry.values?.Type === "X.509 Certificate") {
            if (outputFormat !== "PEM" && outputFormat !== "DER") {
                throw new Error("Unsupported certificate output format.");
            }

            converted = convertCertificate(file.bytes, outputFormat);

        } else if (entry.values?.Type === "OpenSSH Public Key") {
            if (outputFormat !== "RFC4716" && outputFormat !== "PKCS8" && outputFormat !== "PEM") {
                throw new Error("Unsupported OpenSSH public key output format.");
            }

            converted = convertOpenSshPublicKey(file.bytes, outputFormat);

        } else if (entry.values?.Type === "RSA Private Key" || entry.values?.Type === "RSA Public Key" || (entry.values?.Type === "Private Key" && entry.values.Algorithm === "RSA")) {

            if (!isRsaKeyOutputFormat(outputFormat)) {
                throw new Error("Unsupported RSA output format.");
            }

            converted = convertRsaKey(file.bytes, outputFormat);

        } else if (entry.values?.Type === "EC Private Key" || entry.values?.Type === "EC Public Key") {

            if (!isEcKeyOutputFormat(outputFormat)) {
                throw new Error("Unsupported EC output format.");
            }

            converted = convertEcKey(file.bytes, outputFormat);

        } else {
            throw new Error("Conversion is not supported for this file type.");
        }
        
        const safeFileName = normalizeOutputFileName(requestedFileName, file.uri.fsPath, converted.extension);
        const outputDirectory = outputFilePath.trim() || path.dirname(file.uri.fsPath);
        const outputUri = vscode.Uri.file(path.join(outputDirectory, safeFileName));

        await vscode.workspace.fs.writeFile(outputUri, converted.bytes);    
        vscode.window.showInformationMessage(`SATO: converted file saved to ${outputUri.fsPath}`);

    } catch (err) {
        vscode.window.showErrorMessage(`SATO: file conversion failed - ${describeError(err)}`);
    }
}

function convertedFileName(
    filePath: string,
    outputFormat: CryptoOutputFormat
): string {
    const parsed = path.parse(filePath);

    switch (outputFormat) {
        case "DER":
            return `${parsed.name}.der`;

        case "RFC4716":
            return `${parsed.name}-rfc4716.pub`;

        case "PKCS8":
            return `${parsed.name}-pkcs8.pem`;

        case "PEM":
            return `${parsed.name}.pem`;

        case "RSA_PKCS1_PEM":
            return `${parsed.name}-pkcs1-pem.rsa`;

        case "RSA_PKCS1_DER":
            return `${parsed.name}-pkcs1-der.rsa`;

        case "RSA_PKCS8_PEM":
            return `${parsed.name}-pkcs8-pem.rsa`;

        case "RSA_PKCS8_DER":
            return `${parsed.name}-pkcs8-der.rsa`;

        case "RSA_SPKI_PEM":
            return `${parsed.name}-spki-pem.rsa`;

        case "RSA_SPKI_DER":
            return `${parsed.name}-spki-der.rsa`;

        case "RSA_PUBLIC_PKCS1_PEM":
            return `${parsed.name}-public-pkcs1-pem.rsa`;

        case "RSA_PUBLIC_PKCS1_DER":
            return `${parsed.name}-public-pkcs1-der.rsa`;

        case "EC_SEC1_PEM":
            return `${parsed.name}-sec1-pem.ec`;

        case "EC_SEC1_DER":
            return `${parsed.name}-sec1-der.ec`;

        case "EC_PKCS8_PEM":
            return `${parsed.name}-pkcs8-pem.ec`;

        case "EC_PKCS8_DER":
            return `${parsed.name}-pkcs8-der.ec`;

        case "EC_SPKI_PEM":
            return `${parsed.name}-spki-pem.ec`;

        case "EC_SPKI_DER":
            return `${parsed.name}-spki-der.ec`;

        case "SPC_CMS_PEM":
            return `${parsed.name}-cms.pem`;

        case "SPC_CERTIFICATES_PEM":
            return `${parsed.name}-certificates.pem`;

        case "SPC_CERTIFICATES_DER":
            return `${parsed.name}-certificates.der`;

        case "SPC_CERTIFICATE_CHAIN_P7B":
            return `${parsed.name}-certificate-chain.p7b`;

        default:
            return parsed.base;
    }
}

function normalizeOutputFileName(
    requestedFileName: string,
    sourceFilePath: string,
    extension: | ".pem" | ".der" | ".pub" | ".rsa" | ".ec" | ".p7b"
): string {
    const requested = path.basename(requestedFileName.trim());

    if (!requested) {
        return `${path.parse(sourceFilePath).name}${extension}`;
    }

    if (requested.toLowerCase().endsWith(extension)) {
        return requested;
    }

    return `${path.parse(requested).name}${extension}`;
}

function currentEcOutputFormat(
    encoding: string,
    format: string,
    keyKind: "private" | "public"
): CryptoOutputFormat | undefined {
    const normalizedEncoding = encoding.trim().toUpperCase();
    const normalizedFormat = format.trim().toUpperCase();

    if (keyKind === "public") {
        if (normalizedFormat === "SPKI" && normalizedEncoding === "PEM") {
            return "EC_SPKI_PEM";
        }

        if (normalizedFormat === "SPKI" && normalizedEncoding === "DER") {
            return "EC_SPKI_DER";
        }

        return undefined;
    }

    if (normalizedFormat === "SEC1" && normalizedEncoding === "PEM") {
        return "EC_SEC1_PEM";
    }

    if (normalizedFormat === "SEC1" && normalizedEncoding === "DER") {
        return "EC_SEC1_DER";
    }

    if (normalizedFormat === "PKCS#8" && normalizedEncoding === "PEM") {
        return "EC_PKCS8_PEM";
    }

    if (normalizedFormat === "PKCS#8" && normalizedEncoding === "DER") {
        return "EC_PKCS8_DER";
    }

    return undefined;
}

function currentRsaOutputFormat(
    encoding: string,
    format: string,
    keyKind: "private" | "public"
): CryptoOutputFormat | undefined {
    const normalizedEncoding = encoding.trim().toUpperCase();
    const normalizedFormat = format.trim().toUpperCase();

    if (keyKind === "public") {
        if (normalizedFormat === "SPKI") {
            return normalizedEncoding === "PEM" ? "RSA_SPKI_PEM" : normalizedEncoding === "DER" ? "RSA_SPKI_DER" : undefined;
        }

        if (normalizedFormat === "PKCS#1") {
            return normalizedEncoding === "PEM" ? "RSA_PUBLIC_PKCS1_PEM" : normalizedEncoding === "DER" ? "RSA_PUBLIC_PKCS1_DER" : undefined;
        }

        return undefined;
    }

    if (normalizedFormat === "PKCS#1") {
        return normalizedEncoding === "PEM" ? "RSA_PKCS1_PEM" : normalizedEncoding === "DER" ? "RSA_PKCS1_DER" : undefined;
    }

    if (normalizedFormat === "PKCS#8") {
        return normalizedEncoding === "PEM" ? "RSA_PKCS8_PEM" : normalizedEncoding === "DER" ? "RSA_PKCS8_DER" : undefined;
    }

    return undefined;
}

async function updatePrivateKeyPassword(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    entryId: string,
    currentPassword: string,
    newPassword: string | undefined,
    runtime: CryptoMessageRuntime
): Promise<void> {
    const certificate = document.certificate;
    const file = certificate?.filesByEntryId?.[entryId];

    if (!certificate || !file) {
        return;
    }

    try {
        const createBackup = runtime.readSettings().createArchiveBackups;
        const options = {currentPassword: currentPassword || undefined, newPassword, createBackup};
        const lowerPath = file.uri.fsPath.toLowerCase();
        const openPgpPrivateKey = entryIsOpenPgpPrivateKey(certificate, entryId);

        if (lowerPath.endsWith(".luks")) {
            if (!currentPassword || !newPassword) {
                throw new Error("Current and new LUKS passwords are required.");
            }

            await changeLuksPassword(file.uri.fsPath, {currentPassword, newPassword, createBackup});
        } else if (openPgpPrivateKey) {
            await changeGpgPassword(
                file.uri.fsPath,
                {
                    currentPassword: currentPassword || undefined,
                    newPassword: newPassword || undefined,
                    createBackup
                }
            );
        } else if (lowerPath.endsWith(".age")) {
            if (!currentPassword || !newPassword) {
                throw new Error("Current and new age passwords are required.");
            }

            await changeAgePassword(file.uri.fsPath, {currentPassword, newPassword, createBackup});
        } else if (lowerPath.endsWith(".p12") || lowerPath.endsWith(".pfx")) {
            await changePkcs12Password(file.uri.fsPath, options );
        } else if (lowerPath.endsWith(".jks") || lowerPath.endsWith(".jceks")) {
            if (!currentPassword || !newPassword) {
                throw new Error("Current and new KeyStore passwords are required.");
            }

            await changeJksPassword(file.uri.fsPath, {currentPassword, newPassword, createBackup}
            );
        } else if (lowerPath.endsWith(".ppk")) {
            await changePpkPassword(file.uri.fsPath, options);
        } else if (isOpenSshPrivateKeyPath(file.uri.fsPath)) {
            await changeSshKeyPassword(file.uri.fsPath, options);
        } else {
            await changePrivateKeyPassword(file.uri.fsPath, options);
        }

        await runtime.reload();
        await panel.webview.postMessage({type: "privateKeyPasswordChanged"});

        let message: string;
        if (lowerPath.endsWith(".luks")) {
            message = "SATO: LUKS password changed.";
        } else if (openPgpPrivateKey) {
            message = newPassword ? currentPassword ? "SATO: OpenPGP private-key password changed." : "SATO: OpenPGP private-key password set." : "SATO: OpenPGP private-key password removed.";
        } else if (lowerPath.endsWith(".age")) {
            message = "SATO: age password changed.";
        } else if (lowerPath.endsWith(".jks") || lowerPath.endsWith(".jceks")) {
            message = "SATO: KeyStore password changed.";
        } else if (newPassword) {
            message = currentPassword ? "SATO: private key password changed." : "SATO: private key password set.";
        } else {
            message = "SATO: private key password removed.";
        }

        vscode.window.showInformationMessage(message);

    } catch (error) {
        await panel.webview.postMessage({
            type: "privateKeyPasswordChangeFailed",
            message: "Failed to update the password: " + describeError(error)
        });
    }
}

function isPasswordEditablePrivateKey(
    entry: ReturnType<typeof findCryptoEntry>,
    filePath: string
): boolean {
    if (!entry) {
        return false;
    }

    if (filePath.toLowerCase().endsWith(".bak")) {
        return false;
    }

    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
    const fileName = normalizedPath.split("/").at(-1) || "";
    const supportedExtension = [".pem", ".key", ".p8", ".pk8"].some(extension => normalizedPath.endsWith(extension));
    const supportedOpenSshKey = ["id_rsa", "id_ecdsa", "id_ed25519"].includes(fileName);
    const privateKeyType = ["Private Key", "RSA Private Key", "EC Private Key"].includes(entry.values?.Type || "");
    const supportedPpk = normalizedPath.endsWith(".ppk");
    const supportedPkcs12 = normalizedPath.endsWith(".p12") || normalizedPath.endsWith(".pfx");
    const supportedAge = normalizedPath.endsWith(".age");
    const supportedLuks = normalizedPath.endsWith(".luks");
    const luksContainer = entry.values?.Type === "LUKS Encrypted Container" || entry.values?.Type === "LUKS1 Encrypted Container" || entry.values?.Type === "LUKS2 Encrypted Container";
    const supportedOpenPgp = normalizedPath.endsWith(".gpg") || normalizedPath.endsWith(".pgp") || normalizedPath.endsWith(".asc");
    const openPgpPrivateKey = entry.values?.Type === "OpenPGP Private Key";
    const supportedKeyStore = normalizedPath.endsWith(".jks") || normalizedPath.endsWith(".jceks");

    return (supportedExtension && privateKeyType) ||
        (supportedOpenSshKey && entry.values?.Type === "OpenSSH Private Key") ||
        (supportedPpk && entry.values?.Type === "PuTTY Private Key") ||
        (supportedKeyStore && (entry.values?.Type === "Java KeyStore" || entry.values?.Type === "Java Cryptography Extension KeyStore")) ||
        (supportedPkcs12 && entry.values?.Type === "PKCS#12 Container") ||
        (supportedAge && entry.values?.Type === "age Encrypted File" && entry.values?.Protection === "Passphrase") ||
        (supportedOpenPgp && openPgpPrivateKey) || (supportedLuks && luksContainer);
}

function entryIsOpenPgpPrivateKey(
    certificate: NonNullable<VaultDocument["certificate"]>,
    entryId: string
): boolean {
    const entry = findCryptoEntry(certificate, entryId);
    return (entry?.values?.Type === "OpenPGP Private Key");
}

function isOpenSshPrivateKeyPath(
    filePath: string
): boolean {
    const fileName = path.basename(filePath).toLowerCase();
    return (fileName === "id_rsa" || fileName === "id_ecdsa" || fileName === "id_ed25519");
}
