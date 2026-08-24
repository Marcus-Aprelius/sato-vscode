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

export async function openCertificateFile(
    document: VaultDocument
): Promise<boolean> {
    const directoryUri = cryptoDirectoryUri(
        document.uri
    );

    const files =
        await readCryptoFilesFromDirectory(
            directoryUri
        );

    let selectedFiles = files;

    if (
        !selectedFiles.some(
            (file) =>
                file.uri.fsPath ===
                document.uri.fsPath
        )
    ) {
        try {
            const bytes =
                await vscode.workspace.fs.readFile(
                    document.uri
                );

            selectedFiles = [
                ...selectedFiles,
                {
                    uri: document.uri,
                    bytes
                }
            ];
        } catch (err) {
            vscode.window.showErrorMessage(
                `SATO: failed to read file - ${describeError(err)}`
            );

            return false;
        }
    }

    if (!selectedFiles.length) {
        vscode.window.showErrorMessage(
            "SATO: no supported crypto files found"
        );

        return false;
    }

    document.db = undefined;
    document.credentials = undefined;
    document.psafe = undefined;
    document.importedVault = undefined;

    document.certificate =
        buildCertificateDirectoryVault(
            selectedFiles,
            document.uri
        );

    return true;
}

export async function readCryptoFilesFromDirectory(
    directoryUri: vscode.Uri
): Promise<CryptoFileInput[]> {
    let entries: [
        string,
        vscode.FileType
    ][];

    try {
        entries =
            await vscode.workspace.fs.readDirectory(
                directoryUri
            );
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

        const fileUri = vscode.Uri.joinPath(
            directoryUri,
            name
        );

        try {
            const bytes =
                await vscode.workspace.fs.readFile(
                    fileUri
                );

            result.push({
                uri: fileUri,
                bytes
            });
        } catch {
            // Ignore unreadable files.
        }
    }

    return result.sort((left, right) =>
        left.uri.fsPath.localeCompare(
            right.uri.fsPath
        )
    );
}

export function collectCryptoFileInfo(
    certificate: CertificateVault,
    entryId: string
): Record<string, unknown> {
    const entry = findCryptoEntry(
        certificate,
        entryId
    );

    if (!entry) {
        return {
            title: "File Info",
            rows: [
                [
                    "Type",
                    "Crypto file"
                ],
                [
                    "Summary",
                    "No selected crypto entry."
                ]
            ]
        };
    }

    const values = entry.values || {};
    const rows: [string, string][] = [];

    addRow(
        rows,
        "File name",
        entry.title
    );

    addRow(
        rows,
        "Type",
        values.Type || "Crypto file"
    );

    addRow(
        rows,
        "Status",
        values.Status
    );

    addRow(
        rows,
        "Encoding",
        values.Encoding
    );

    addRow(
        rows,
        "Subject",
        values.Subject
    );

    addRow(
        rows,
        "Issuer",
        values.Issuer
    );

    addRow(
        rows,
        "Valid from",
        values["Valid from"]
    );

    addRow(
        rows,
        "Valid to",
        values["Valid to"]
    );

    addRow(
        rows,
        "Public key algorithm",
        values["Public key algorithm"] ||
            values["Public Key Algorithm"]
    );

    addRow(
        rows,
        "Key size",
        values["Key size"] ||
            values["Key Size"]
    );

    addRow(
        rows,
        "Algorithm",
        values.Algorithm
    );

    addRow(
        rows,
        "Curve",
        values.Curve
    );

    addRow(
        rows,
        "Certificate count",
        values["Certificate count"]
    );

    addRow(
        rows,
        "Private key bags",
        values["Private key bags"]
    );

    addRow(
        rows,
        "Friendly names",
        values["Friendly names"]
    );

    addRow(
        rows,
        "Aliases",
        values.Aliases
    );

    addRow(
        rows,
        "Owners",
        values.Owners
    );

    addRow(
        rows,
        "Issuers",
        values.Issuers
    );

    addRow(
        rows,
        "Fingerprint SHA-256",
        values["Fingerprint SHA-256"]
    );

    addRow(
        rows,
        "SHA-256",
        values["SHA-256"]
    );

    addRow(
        rows,
        "File size",
        values["Container size"] ||
            values["File size"]
    );

    addRow(
        rows,
        "File path",
        values["File path"]
    );

    addRow(
        rows,
        "Summary",
        values.Summary
    );

    return {
        title: "File Info",
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

function findCryptoEntry(
    certificate: CertificateVault,
    entryId: string
): GroupView["entries"][number] | undefined {
    const walk = (
        group: GroupView
    ): GroupView["entries"][number] | undefined => {
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

    rows.push([
        label,
        value
    ]);
}

function describeError(
    err: unknown
): string {
    if (err instanceof Error) {
        return err.message;
    }

    return String(err);
}
