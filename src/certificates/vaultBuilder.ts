import { fileNameOf } from "./fileTypes";
import { isExpiredCertificate } from "./format";

import type * as vscode from "vscode";
import type { GroupView, VaultStats } from "../vault";

import type {
    CertificateVault,
    CryptoFileInput,
    CryptoInspection
} from "./types";

export type CryptoFileInspector = (
    text: string,
    bytes: Uint8Array,
    filePath: string
) => CryptoInspection;

export function buildCertificateVault(
    uri: vscode.Uri,
    bytes: Uint8Array,
    inspectFile: CryptoFileInspector
): CertificateVault {
    return buildCertificateDirectoryVault(
        [
            { uri, bytes }
        ],
        uri,
        inspectFile
    );
}

export function buildCertificateDirectoryVault(
    files: CryptoFileInput[],
    selectedUri: vscode.Uri,
    inspectFile: CryptoFileInspector
): CertificateVault {
    const sortedFiles = files
        .slice()
        .sort((left, right) => fileNameOf(left.uri).localeCompare(fileNameOf(right.uri)));

    const privateKeysByEntryId:
        Record<string, string> = {};

    const filesByEntryId:
        Record<string, CryptoFileInput> = {};

    let selectedEntryId = "";

    const groups: GroupView[] =
        sortedFiles.map((file) => {
            const fileName = fileNameOf(file.uri);
            const entryId = cryptoEntryId(file.uri);
            const groupId = cryptoGroupId(file.uri);
            const lowerPath = file.uri.fsPath.toLowerCase();

            filesByEntryId[entryId] = file;

            const text = shouldReadAsText(lowerPath) ? Buffer.from(file.bytes).toString("utf8") : "";
            const inspected = inspectFile(text, file.bytes, file.uri.fsPath);

            if (inspected.privateKeyPem) {
                privateKeysByEntryId[entryId] =
                    inspected.privateKeyPem;
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
        expired: groups.reduce((count, group) => count + ( group.entries[0].expired ? 1 : 0 ), 0),
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

function shouldReadAsText(
    lowerPath: string
): boolean {
    return !(
        lowerPath.endsWith(".p12") ||
        lowerPath.endsWith(".pfx") ||
        lowerPath.endsWith(".p7b") ||
        lowerPath.endsWith(".p7c") ||
        lowerPath.endsWith(".p7s") ||
        lowerPath.endsWith(".p7m") ||
        lowerPath.endsWith(".p8") ||
        lowerPath.endsWith(".pk8") ||
        lowerPath.endsWith(".age") ||
        lowerPath.endsWith(".jks") ||
        lowerPath.endsWith(".jceks") ||
        lowerPath.endsWith(".gpg") ||
        lowerPath.endsWith(".pgp") ||
        lowerPath.endsWith(".sig")
    );
}

function cryptoEntryId(
    uri: vscode.Uri
): string {
    return `crypto-entry:${uri.fsPath}`;
}

function cryptoGroupId(
    uri: vscode.Uri
): string {
    return `crypto-group:${uri.fsPath}`;
}
