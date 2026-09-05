import { inspectCryptoFile } from "./inspectionRouter";

import type * as vscode from "vscode";
import type { CertificateVault, CryptoFileInput } from "./types";

import {
    buildCertificateDirectoryVault as buildVaultDirectory,
    buildCertificateVault as buildSingleVault
} from "./vaultBuilder";

export { isCertificateLikeFileName, isCertificateLikeUri } from "./fileTypes";
export { lockCryptoContainer, unlockCryptoContainer } from "./containerActions";

export {
    certificateOutputFormat,
    convertCertificate,
    convertOpenSshPublicKey,
    openSshPublicKeyOutputFormats
} from "./converter";

export type {
    CertificateVault,
    CryptoContainerUnlockResult,
    CryptoFileInput,
    CryptoInspection
} from "./types";

export type {
    AvailableOutputFormat,
    CryptoConversionResult,
    CertificateOutputFormat,
    CryptoOutputFormat,
    OpenSshPublicKeyOutputFormat
} from "./converter";

export function buildCertificateVault(
    uri: vscode.Uri,
    bytes: Uint8Array
): CertificateVault {
    return buildSingleVault(uri, bytes, inspectCryptoFile);
}

export function buildCertificateDirectoryVault(
    files: CryptoFileInput[],
    selectedUri: vscode.Uri
): CertificateVault {
    return buildVaultDirectory(files, selectedUri, inspectCryptoFile);
}
