import * as vscode from "vscode";
import { isCommandAvailable } from "../certificates/cli";


export function prepareCryptoUnlock(
    filePath: string
): boolean {
    const normalizedPath =
        filePath.toLowerCase();

    if (normalizedPath.endsWith(".p12") || normalizedPath.endsWith(".pfx")) {
        return checkOpenSsl();
    }

    if (normalizedPath.endsWith(".jks") || normalizedPath.endsWith(".jceks") ) {
        return checkKeytool();
    }

    if (normalizedPath.endsWith(".gpg") || normalizedPath.endsWith(".pgp") ) {
        return checkGpg();
    }

    return true;
}

function checkOpenSsl(): boolean {
    if (isCommandAvailable("openssl")) {
        return true;
    }

    const installHint =
        process.platform === "win32"
            ? "Install OpenSSL, add openssl.exe to PATH, and restart VS Code."
            : process.platform === "darwin"
                ? "Install OpenSSL with: brew install openssl"
                : "Install OpenSSL using your system package manager.";

    vscode.window.showWarningMessage(
        `SATO: OpenSSL is required to unlock PKCS#12/PFX containers. ${installHint}`
    );

    return false;
}

function checkKeytool(): boolean {
    if (isCommandAvailable("keytool")) {
        return true;
    }

    const installHint =
        process.platform === "win32"
            ? "Install a Java Runtime, add keytool.exe to PATH, and restart VS Code."
            : process.platform === "darwin"
                ? "Install Java with: brew install openjdk"
                : "Install a Java Runtime, for example default-jre-headless.";

    vscode.window.showWarningMessage(
        `SATO: keytool is required to unlock Java KeyStore files. ${installHint}`
    );

    return false;
}

function checkGpg(): boolean {
    if (isCommandAvailable("gpg")) {
        return true;
    }

    const installHint =
        process.platform === "win32"
            ? "Install Gpg4win, add gpg.exe to PATH, and restart VS Code."
            : process.platform === "darwin"
                ? "Install GnuPG with: brew install gnupg"
                : "Install GnuPG using your system package manager.";

    vscode.window.showWarningMessage(
        `SATO: GPG is required to inspect and decrypt OpenPGP files. ${installHint}`
    );

    return false;
}
