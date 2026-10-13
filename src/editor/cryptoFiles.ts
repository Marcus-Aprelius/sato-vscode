import * as path from "path";
import * as vscode from "vscode";

import {
    buildCertificateDirectoryVault,
    isCertificateLikeFileName,
    type CertificateVault,
    type CryptoFileInput
} from "../certificates";

import type { GroupView } from "../vault";
import type { VaultDocument } from "../types";
import type { SupportedDirectoryFile } from "../archives";

import { describeError } from "../utils/errors";
import { supportedFileCategory } from "../fileFormats";

export async function openCertificateFile(
    document: VaultDocument
): Promise<boolean> {
    const activeUri = document.activeUri ?? document.uri;
    const directoryUri = cryptoDirectoryUri(activeUri);
    const supportedFiles = await readSupportedFilesFromDirectory(directoryUri);

    let selectedFiles: CryptoFileInput[] = [];

    try {
        const bytes = await vscode.workspace.fs.readFile(activeUri);
        selectedFiles = [{uri: activeUri, bytes}];

    } catch (err) {
        vscode.window.showErrorMessage(`SATO: failed to read file - ${describeError(err)}`);
        return false;
    }

    document.db = undefined;
    document.credentials = undefined;
    document.psafe = undefined;
    document.archive = undefined;
    document.importedVault = undefined;

    const selectedCategory = supportedFileCategory(path.basename(activeUri.fsPath));

    if (selectedCategory && !supportedFiles.some(file => file.filePath === activeUri.fsPath)) {
        supportedFiles.push({
            fileName: path.basename(activeUri.fsPath),
            filePath: activeUri.fsPath,
            category: selectedCategory
        });
    }

    supportedFiles.sort((left, right) => left.fileName.localeCompare(right.fileName, undefined, {sensitivity: "base"}));
    document.certificate = buildCertificateDirectoryVault(selectedFiles, activeUri, supportedFiles);
    return true;
}

export async function readCryptoFilesFromDirectory(
    directoryUri: vscode.Uri
): Promise<CryptoFileInput[]> {
    let entries: [string, vscode.FileType ][];

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

            result.push({uri: fileUri, bytes});

        } catch {
            // Ignore unreadable files.
        }
    }

    return result.sort((left, right) =>
        left.uri.fsPath.localeCompare(right.uri.fsPath)
    );
}

async function readSupportedFilesFromDirectory(
    directoryUri: vscode.Uri
): Promise<SupportedDirectoryFile[]> {
    let entries: [string, vscode.FileType][];

    try {
        entries = await vscode.workspace.fs.readDirectory(directoryUri);

    } catch {
        return [];
    }

    const files: SupportedDirectoryFile[] = [];

    for (const [name, fileType] of entries) {
        if (fileType !== vscode.FileType.File) {
            continue;
        }

        const category = supportedFileCategory(name);

        if (!category) {
            continue;
        }

        const uri = vscode.Uri.joinPath(directoryUri, name);
        files.push({fileName: name, filePath: uri.fsPath, category});
    }

    return files;
}

export function collectCryptoFileInfo(
    certificate: CertificateVault,
    entryId: string
): Record<string, unknown> {
    const entry = findCryptoEntry(certificate, entryId);

    if (!entry) {
        return {
            title: "File Info",
            rows: [["Type", "Crypto file"], ["Summary", "No selected crypto entry."]]
        };
    }

    const values = entry.values || {};
    const rows: [string, string][] = [];

    addRow(rows, "File name", entry.title);
    addRow(rows, "Type", values.Type || "Crypto file");
    addRow(rows, "Status", values.Status);
    addRow(rows, "Encoding", values.Encoding);
    addRow(rows, "Subject", values.Subject);
    addRow(rows, "Issuer", values.Issuer);
    addRow(rows, "Valid from", values["Valid from"]);
    addRow(rows, "Valid to", values["Valid to"]);
    addRow(rows, "Public key algorithm", values["Public key algorithm"] || values["Public Key Algorithm"]);
    addRow(rows, "Key size", values["Key size"] || values["Key Size"]);
    addRow(rows, "Algorithm", values.Algorithm);
    addRow(rows, "Curve", values.Curve);
    addRow(rows, "Certificate count", values["Certificate count"]);
    addRow(rows, "Private key bags", values["Private key bags"]);
    addRow(rows, "Friendly names", values["Friendly names"]);
    addRow(rows, "Aliases", values.Aliases);
    addRow(rows, "Owners", values.Owners);
    addRow(rows, "Issuers", values.Issuers);
    addRow(rows, "Fingerprint SHA-256", values["Fingerprint SHA-256"]);
    addRow(rows, "SHA-256", values["SHA-256"]);
    addRow(rows, "File size", values["Container size"] || values["File size"]);
    addRow(rows, "File path", values["File path"]);
    addRow(rows, "Summary", values.Summary);

    return {
        title: "File Info",
        entryId: entry.id,
        hasPrivateKey: entry.hasPrivateKey === true,
        rows
    };
}

function cryptoDirectoryUri(
    uri: vscode.Uri
): vscode.Uri {
    return vscode.Uri.file(
        path.dirname(uri.fsPath)
    );
}

export function findCryptoEntry(
    certificate: CertificateVault,
    entryId: string
): GroupView["entries"][number] | undefined {
    const walk = (group: GroupView): GroupView["entries"][number] | undefined => {
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

function addRow(
    rows: [string, string][],
    label: string,
    value: string | undefined
): void {
    if (!value) {
        return;
    }

    rows.push([label, value]);
}
