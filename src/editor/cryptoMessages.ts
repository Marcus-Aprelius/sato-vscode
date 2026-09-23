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
    type SpcOutputFormat,
    type AvailableOutputFormat,
    type CertificateVault,
    type CryptoFileInput,
    type CryptoOutputFormat
} from "../certificates";

export interface CryptoMessageRuntime {
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
    panel.webview.postMessage({type: "vaultState", state: {tree: certificate.tree, stats: certificate.stats, settings, selectedEntryId}});
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
