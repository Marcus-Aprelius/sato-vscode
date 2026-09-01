import { inspectCryptoFile } from "./inspectionRouter";

import {
    buildCertificateDirectoryVault as buildVaultDirectory,
    buildCertificateVault as buildSingleVault
} from "./vaultBuilder";

import type * as vscode from "vscode";
import type { CertificateVault, CryptoFileInput } from "./types";

export { lockCryptoContainer, unlockCryptoContainer } from "./containerActions";
export { isCertificateLikeFileName, isCertificateLikeUri } from "./fileTypes";

export type {
    CertificateVault,
    CryptoContainerUnlockResult,
    CryptoFileInput,
    CryptoInspection
} from "./types";

export function buildCertificateVault(
    uri: vscode.Uri,
    bytes: Uint8Array
): CertificateVault {
    return buildSingleVault(
        uri,
        bytes,
        inspectCryptoFile
    );
}

export function buildCertificateDirectoryVault(
    files: CryptoFileInput[],
    selectedUri: vscode.Uri
): CertificateVault {
    return buildVaultDirectory(
        files,
        selectedUri,
        inspectCryptoFile
    );
}
