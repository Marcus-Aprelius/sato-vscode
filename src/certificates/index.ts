import { inspectCryptoFile } from "./inspectionRouter";

import {
    buildCertificateDirectoryVault as buildVaultDirectory,
    buildCertificateVault as buildSingleVault
} from "./vaultBuilder";

import type * as vscode from "vscode";
import type { CertificateVault, CryptoFileInput } from "./types";
import type { SupportedDirectoryFile } from "../archives";

export { isCertificateLikeFileName, isCertificateLikeUri } from "./fileTypes";
export { lockCryptoContainer, unlockCryptoContainer } from "./containerActions";
export { changePrivateKeyPassword } from "./privateKeyPasswordEditor";
export { changeSshKeyPassword } from "./sshKeyPasswordEditor";
export { changePpkPassword } from "./ppkPasswordEditor";
export { changeJksPassword } from "./jksPasswordEditor";
export { changePkcs12Password } from "./pkcs12PasswordEditor";
export { changeAgePassword } from "./agePasswordEditor";
export { changeGpgPassword } from "./gpgPasswordEditor";
export { changeLuksPassword } from "./luksPasswordEditor";

export type { LuksPasswordChangeOptions, LuksPasswordChangeResult } from "./luksPasswordEditor";
export type { GpgPasswordChangeOptions, GpgPasswordChangeResult } from "./gpgPasswordEditor";
export type { AgePasswordChangeOptions, AgePasswordChangeResult } from "./agePasswordEditor";
export type { Pkcs12PasswordChangeOptions, Pkcs12PasswordChangeResult } from "./pkcs12PasswordEditor";
export type { JksPasswordChangeOptions } from "./jksPasswordEditor";
export type { PpkPasswordChangeOptions } from "./ppkPasswordEditor";
export type { SshKeyPasswordChangeOptions } from "./sshKeyPasswordEditor";
export type { PrivateKeyPasswordChangeOptions, PrivateKeyPasswordChangeResult } from "./privateKeyPasswordEditor";

export {
    certificateOutputFormat,
    convertCertificate,
    convertEcKey,
    convertOpenSshPublicKey,
    convertRsaKey,
    convertSpc,
    ecKeyOutputFormats,
    isEcKeyOutputFormat,
    isRsaKeyOutputFormat,
    isSpcOutputFormat,
    openSshPublicKeyOutputFormats,
    rsaKeyOutputFormats,
    spcOutputFormats
} from "./converter";

export type {
    CertificateVault,
    CryptoContainerUnlockResult,
    CryptoFileInput,
    CryptoInspection
} from "./types";

export type {
    AvailableOutputFormat,
    CertificateOutputFormat,
    CryptoConversionResult,
    CryptoOutputFormat,
    EcKeyOutputFormat,
    OpenSshPublicKeyOutputFormat,
    RsaKeyOutputFormat,
    SpcConversionFile,
    SpcConversionResult,
    SpcOutputFormat
} from "./converter";

export function buildCertificateVault(
    uri: vscode.Uri,
    bytes: Uint8Array
): CertificateVault {
    return buildSingleVault(uri, bytes, inspectCryptoFile);
}

export function buildCertificateDirectoryVault(
    files: CryptoFileInput[],
    selectedUri: vscode.Uri,
    supportedFiles?: SupportedDirectoryFile[]
): CertificateVault {
    return buildVaultDirectory(files, selectedUri, inspectCryptoFile, supportedFiles);
}
