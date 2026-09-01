import * as vscode from "vscode";
import { isCommandAvailable } from "../certificates/cli";
import { SSH_PRIVATE_KEY_FILE_NAMES } from "../fileFormats";

export function prepareCryptoUnlock(
    filePath: string
): boolean {
    const normalizedPath = filePath.toLowerCase();

    if (normalizedPath.endsWith(".p12") || normalizedPath.endsWith(".pfx")) {return checkOpenSsl();}
    if (normalizedPath.endsWith(".ppk")) {return checkPuttygen();}
    if (normalizedPath.endsWith(".jks") || normalizedPath.endsWith(".jceks") ) {return checkKeytool();}
    if (normalizedPath.endsWith(".gpg") || normalizedPath.endsWith(".pgp") || normalizedPath.endsWith(".asc")) {return checkGpg();}
    if (isSshPrivateKeyPath(normalizedPath)) {return checkSshKeygen();}

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

    vscode.window.showWarningMessage(`SATO: OpenSSL is required to unlock PKCS#12/PFX containers. ${installHint}`);

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

    vscode.window.showWarningMessage(`SATO: keytool is required to unlock Java KeyStore files. ${installHint}`);

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

    vscode.window.showWarningMessage(`SATO: GPG is required to inspect and decrypt OpenPGP files. ${installHint}`);

    return false;
}

function checkPuttygen(): boolean {
    if (isCommandAvailable("puttygen")) {
        return true;
    }

    const installHint =
        process.platform === "win32"
            ? "Install PuTTY, add puttygen.exe to PATH, and restart VS Code."
            : process.platform === "darwin"
                ? "Install PuTTY with: brew install putty"
                : "Install PuTTY tools, for example: sudo apt install putty-tools";

    vscode.window.showWarningMessage(`SATO: puttygen is required to unlock PuTTY private keys. ${installHint}`);

    return false;
}

function isSshPrivateKeyPath(
    filePath: string
): boolean {
    const fileName = filePath
        .replace(/\\/g, "/")
        .split("/")
        .pop() || "";

    return SSH_PRIVATE_KEY_FILE_NAMES.some((supportedName) => fileName === supportedName);
}

function checkSshKeygen(): boolean {
    if (isCommandAvailable("ssh-keygen")) {
        return true;
    }

    const installHint =
        process.platform === "win32"
            ? "Install the Windows OpenSSH Client, ensure ssh-keygen.exe is available in PATH, and restart VS Code."
            : process.platform === "darwin"
                ? "Install or enable the macOS OpenSSH tools."
                : "Install OpenSSH tools, for example: sudo apt install openssh-client";

    vscode.window.showWarningMessage(`SATO: ssh-keygen is required to unlock SSH private keys. ${installHint}`);

    return false;
}
