import * as path from "path";
import * as vscode from "vscode";
import { isOpenPgpEncryptedFile } from "./uriTypes";
import { collectCryptoFileInfo } from "./cryptoFiles";
import { prepareCryptoUnlock } from "./dependencyChecks";

import type { FromWebview, VaultDocument } from "../types";
import type { Settings } from "../webview";

import {
    lockCryptoContainer,
    unlockCryptoContainer,
    type CryptoFileInput
} from "../certificates";

export interface CryptoMessageRuntime {
    readSettings: () => Settings;

    copyToClipboard: (
        value: string,
        message: string,
        settings: Settings
    ) => Promise<void>;
}

export async function handleCryptoMessage(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    msg: FromWebview,
    runtime: CryptoMessageRuntime
): Promise<boolean> {
    if (msg.type === "selectOpenPgpPrivateKey") {
        await selectOpenPgpPrivateKey(
            document,
            panel,
            msg.entryId
        );

        return true;
    }

    if (msg.type === "prepareCryptoUnlock") {
        prepareCryptoContainerUnlock(
            document,
            panel,
            msg.entryId
        );

        return true;
    }

    const certificate = document.certificate;

    if (!certificate) {
        return false;
    }

    if (msg.type === "getDbInfo") {
        const info = collectCryptoFileInfo(
            certificate,
            msg.entryId ||
                certificate.selectedEntryId
        );

        panel.webview.postMessage({
            type: "dbInfo",
            info
        });

        return true;
    }

    if (msg.type === "unlockCryptoContainer") {
        const encryptedFile =
            certificate.filesByEntryId?.[
                msg.entryId
            ];

        let privateKeyFile:
            CryptoFileInput | undefined;

        if (
            encryptedFile &&
            isOpenPgpEncryptedFile(
                encryptedFile.uri
            )
        ) {
            const privateKeyPath =
                msg.privateKeyPath?.trim();

            if (!privateKeyPath) {
                panel.webview.postMessage({
                    type:
                        "cryptoContainerUnlockFailed",
                    entryId: msg.entryId,
                    message:
                        "Select an OpenPGP private key file."
                });

                return true;
            }

            const privateKeyUri =
                vscode.Uri.file(
                    privateKeyPath
                );

            try {
                privateKeyFile = {
                    uri: privateKeyUri,
                    bytes:
                        await vscode.workspace.fs
                            .readFile(
                                privateKeyUri
                            )
                };
            } catch (err) {
                panel.webview.postMessage({
                    type:
                        "cryptoContainerUnlockFailed",
                    entryId: msg.entryId,
                    message:
                        `Failed to read private key: ${describeError(err)}`
                });

                return true;
            }
        }

        const result = unlockCryptoContainer(
            certificate,
            msg.entryId,
            msg.password,
            privateKeyFile
        );

        if (!result.ok) {
            panel.webview.postMessage({
                type:
                    "cryptoContainerUnlockFailed",
                entryId: msg.entryId,
                message:
                    result.message ||
                    "Failed to unlock encrypted file."
            });

            return true;
        }

        postCertificateState(
            certificate,
            panel,
            runtime.readSettings(),
            msg.entryId
        );

        vscode.window.setStatusBarMessage(
            isOpenPgpEncryptedFile(
                encryptedFile?.uri
            )
                ? "SATO: OpenPGP message decrypted"
                : "SATO: crypto container unlocked",
            2500
        );

        return true;
    }

    if (msg.type === "lockCryptoContainer") {
        const result = lockCryptoContainer(
            certificate,
            msg.entryId
        );

        if (!result.ok) {
            panel.webview.postMessage({
                type:
                    "cryptoContainerUnlockFailed",
                entryId: msg.entryId,
                message:
                    result.message ||
                    "Failed to lock crypto container."
            });

            return true;
        }

        postCertificateState(
            certificate,
            panel,
            runtime.readSettings(),
            msg.entryId
        );

        vscode.window.setStatusBarMessage(
            "SATO: crypto container locked",
            2500
        );

        return true;
    }

    if (msg.type === "copyText") {
        await runtime.copyToClipboard(
            msg.text,
            "SATO: copied text",
            runtime.readSettings()
        );

        return true;
    }

    if (msg.type === "revealPrivateKey") {
        const entryId =
            msg.entryId ||
            certificate.selectedEntryId;

        const privateKeyPem =
            certificate
                .privateKeysByEntryId?.[
                    entryId
                ] ||
            certificate.privateKeyPem;

        if (privateKeyPem) {
            panel.webview.postMessage({
                type: "privateKeyRevealed",
                entryId,
                value: privateKeyPem
            });
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
    const encryptedFile =
        document.certificate
            ?.filesByEntryId?.[entryId];

    if (!encryptedFile) {
        panel.webview.postMessage({
            type: "cryptoContainerUnlockFailed",
            entryId,
            message:
                "Encrypted OpenPGP file is not available."
        });

        return;
    }

    const selected =
        await vscode.window.showOpenDialog({
            title:
                "SATO - Select OpenPGP Private Key",

            defaultUri: vscode.Uri.file(
                path.dirname(
                    encryptedFile.uri.fsPath
                )
            ),

            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,

            filters: {
                "OpenPGP private keys": [
                    "asc",
                    "gpg",
                    "pgp"
                ],

                "All files": [
                    "*"
                ]
            }
        });

    const privateKeyUri = selected?.[0];

    if (!privateKeyUri) {
        return;
    }

    panel.webview.postMessage({
        type: "openPgpPrivateKeySelected",
        entryId,
        filePath: privateKeyUri.fsPath
    });
}

function prepareCryptoContainerUnlock(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    entryId: string
): void {
    const file =
        document.certificate
            ?.filesByEntryId?.[entryId];

    if (!file) {
        vscode.window.showWarningMessage(
            "SATO: encrypted file is not available."
        );

        return;
    }

    if (!prepareCryptoUnlock(file.uri.fsPath)) {
        return;
    }

    panel.webview.postMessage({
        type: "cryptoUnlockReady",
        entryId
    });
}

function postCertificateState(
    certificate: NonNullable<
        VaultDocument["certificate"]
    >,
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
            selectedEntryId
        }
    });
}

function describeError(
    err: unknown
): string {
    if (err instanceof Error) {
        return err.message;
    }

    return String(err);
}
