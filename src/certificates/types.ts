import type * as vscode from "vscode";
import type { GroupView, VaultStats } from "../vault";
import type { SupportedDirectoryFile } from "../archives";

export interface CertificateVault {
    tree: GroupView;
    stats: VaultStats;
    supportedFiles: SupportedDirectoryFile[];
    privateKeyPem?: string;
    privateKeysByEntryId?: Record<string, string>;
    filesByEntryId?: Record<string, CryptoFileInput>;
    selectedEntryId: string;
}

export interface CryptoFileInput {
    uri: vscode.Uri;
    bytes: Uint8Array;
}

export interface CryptoContainerUnlockResult {
    ok: boolean;
    message?: string;
}

export interface CryptoInspection {
    values: Record<string, string>;
    privateKeyPem?: string;
}
