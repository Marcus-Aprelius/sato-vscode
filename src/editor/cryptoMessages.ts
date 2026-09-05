import * as path from "path";
import * as vscode from "vscode";
import { isOpenPgpEncryptedFile } from "./uriTypes";
import { prepareCryptoUnlock } from "./dependencyChecks";
import { collectCryptoFileInfo, findCryptoEntry } from "./cryptoFiles";

import type { FromWebview, VaultDocument } from "../types";
import type { Settings } from "../webview";

import {
    buildCertificateDirectoryVault,
    certificateOutputFormat,
    convertCertificate,
    convertOpenSshPublicKey,
    lockCryptoContainer,
    openSshPublicKeyOutputFormats,
    unlockCryptoContainer,
    type AvailableOutputFormat,
    type CertificateVault,
    type CryptoFileInput,
    type CryptoOutputFormat
} from "../certificates";

export interface CryptoMessageRuntime {
    readSettings: () => Settings;

    copyToClipboard: (
        value: string,
        message: string,
        settings: Settings
    ) => Promise<void>;
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
                    filters: {"Supported conversion sources": ["crt", "cer", "der", "pem", "pub"]}
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

        prepareCryptoConversion(certificate, panel, msg.entryId);
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
                privateKeyFile = {
                    uri: privateKeyUri,
                    bytes: await vscode.workspace.fs.readFile(privateKeyUri)
                };

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

    const selected =
        await vscode.window.showOpenDialog({
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

function describeError(
    err: unknown
): string {
    if (err instanceof Error) {
        return err.message;
    }

    return String(err);
}

function prepareCryptoConversion(
    certificate: NonNullable<VaultDocument["certificate"]>,
    panel: vscode.WebviewPanel,
    entryId: string
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

    } else if (
        values.Type === "OpenSSH Public Key"
    ) {
        sourceFormat = "OpenSSH";
        availableOutputFormats = openSshPublicKeyOutputFormats(values["Key type"] || "");

        const firstFormat = availableOutputFormats[0];

        if (!firstFormat) {
            vscode.window.showInformationMessage("SATO: no output formats are available for this public key.");
            return;
        }

        outputFormat = firstFormat.value;

    } else {
        vscode.window.showInformationMessage("SATO: conversion is not supported for this file type.");
        return;
    }

    panel.webview.postMessage({type: "cryptoConversionReady",
        conversion: {
            entryId,
            fileName: path.basename(file.uri.fsPath),
            filePath: file.uri.fsPath,
            type: values.Type || "Crypto file",
            sourceFormat,
            outputFormat,
            availableOutputFormats,
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

        } else if (
            entry.values?.Type === "OpenSSH Public Key") {
            if (outputFormat !== "RFC4716" && outputFormat !== "PKCS8" && outputFormat !== "PEM") {
                throw new Error("Unsupported OpenSSH public key output format.");
            }

            converted = convertOpenSshPublicKey(file.bytes, outputFormat);

        } else {
            throw new Error("Conversion is not supported for this file type.");
        }
        
        const safeFileName = normalizeOutputFileName(requestedFileName, file.uri.fsPath, converted.extension);

        const outputUri = await vscode.window.showSaveDialog({
            title: `SATO - Convert to ${outputFormat}`,
            defaultUri: vscode.Uri.file( path.join(outputFilePath.trim() || path.dirname(file.uri.fsPath), safeFileName)),
            filters: conversionSaveFilters(outputFormat)
        });

        if (!outputUri) {
            return;
        }

        await vscode.workspace.fs.writeFile(outputUri, converted.bytes);

        vscode.window.showInformationMessage(`SATO: file converted to ${outputFormat}.`);
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
        case "DER": return `${parsed.name}.der`;
        case "RFC4716": return `${parsed.name}-rfc4716.pub`;
        case "PKCS8": return `${parsed.name}-pkcs8.pem`;
        case "PEM": return `${parsed.name}.pem`;
        default: return parsed.base;
    }
}

function normalizeOutputFileName(
    requestedFileName: string,
    sourceFilePath: string,
    extension: ".pem" | ".der" | ".pub"
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

function conversionSaveFilters(
    outputFormat: CryptoOutputFormat
): Record<string, string[]> {
    switch (outputFormat) {
        case "DER": return {"DER file": ["der"]};
        case "RFC4716": return {"RFC 4716 public key": ["pub"]};
        case "PKCS8": return {"PKCS#8 PEM public key": ["pem"]};
        case "PEM":return {"PEM file": ["pem"]};
    }
}
