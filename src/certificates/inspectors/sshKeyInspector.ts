import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";


import { spawnSync } from "child_process";
import { fileMetadata } from "../fileMetadata";
import { formatSshAlgorithm, sshAlgorithmFromFilePath } from "../sshFormat";
import { createTemporaryDirectory, removeTemporaryDirectory } from "../cli/tempDirectory";

import type { CryptoInspection } from "../types";

export function inspectSshPrivateKey(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const algorithm = sshAlgorithmFromFilePath(filePath);
    const encrypted = isEncryptedOpenSshKey(text);

    if (encrypted) {
        return lockedInspection(bytes, filePath, algorithm);
    }

    const publicKey = extractPublicKey(bytes, "");

    if (!publicKey) {
        return {
            values: {
                Type: "OpenSSH Private Key",
                Format: detectKeyFormat(text),
                Status: "Unsupported",
                Algorithm: algorithm,
                Summary: "SSH private key detected, but its metadata could not be read.",
                ...fileMetadata(bytes, filePath)
            }
        };
    }

    return unlockedInspection(text, bytes, filePath, publicKey, false);
}

export function inspectSshPrivateKeyUnlocked(
    text: string,
    bytes: Uint8Array,
    filePath: string,
    password: string
): CryptoInspection {
    const publicKey = extractPublicKey(bytes, password);

    if (!publicKey) {
        return {
            values: {
                Type: "OpenSSH Private Key",
                Format: detectKeyFormat(text),
                Status: "Unlock failed",
                Protection: "Password encrypted",
                Algorithm: sshAlgorithmFromFilePath(filePath),
                Summary: "Failed to unlock SSH private key. The password may be incorrect or ssh-keygen may be unavailable.",
                ...fileMetadata(bytes, filePath)
            }
        };
    }

    const privateKeyPem = createUnlockedPrivateKeyCopy(bytes, password);

    if (!privateKeyPem) {
        return {
            values: {
                Type: "OpenSSH Private Key",
                Format: detectKeyFormat(text),
                Status: "Unlock failed",
                Protection: "Password encrypted",
                Algorithm: publicKey.algorithm,
                Summary: "The SSH key password was accepted, but the unlocked private key could not be exported.",
                ...fileMetadata(bytes, filePath)
            }
        };
    }

    return unlockedInspection(privateKeyPem, bytes, filePath, publicKey, true);
}

interface SshPublicKeyInfo {
    algorithm: string;
    comment: string;
    fingerprint: string;
    keySize: string;
}

function unlockedInspection(
    privateKeyPem: string,
    bytes: Uint8Array,
    filePath: string,
    publicKey: SshPublicKeyInfo,
    passwordEncrypted: boolean
): CryptoInspection {
    return {
        values: {
            Type: "OpenSSH Private Key",
            Format: detectKeyFormat(privateKeyPem),
            Status: "Unlocked",
            Protection: passwordEncrypted ? "Password encrypted" : "None",
            Algorithm: publicKey.algorithm,
            "Key size": publicKey.keySize,
            Comment: publicKey.comment,
            "Public key fingerprint": publicKey.fingerprint,
            ...fileMetadata(bytes, filePath),
            Summary: [publicKey.algorithm, publicKey.keySize, "SSH private key."]
                .filter(Boolean)
                .join(" ")
        },
        privateKeyPem
    };
}

function lockedInspection(
    bytes: Uint8Array,
    filePath: string,
    algorithm: string
): CryptoInspection {
    return {
        values: {
            Type: "OpenSSH Private Key",
            Format: "OpenSSH",
            Status: "Locked",
            Protection: "Password encrypted",
            Algorithm: algorithm,
            Summary: "Encrypted OpenSSH private key detected. Enter the password to inspect the key.",
            ...fileMetadata(bytes, filePath)
        }
    };
}

function extractPublicKey(
    bytes: Uint8Array,
    password: string
): SshPublicKeyInfo | undefined {
    
    const temporaryDirectory = createTemporaryDirectory("sato-ssh-key-");
    const privateKeyPath = path.join(temporaryDirectory, "private-key");

    try {
        fs.writeFileSync(privateKeyPath, Buffer.from(bytes), {mode: 0o600});

        const result = spawnSync(
            "ssh-keygen",
            ["-y", "-P", password, "-f", privateKeyPath],
            {encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true}
        );

        if (result.error || result.status !== 0 || !result.stdout?.trim()) {
            return undefined;
        }

        return parsePublicKey(
            result.stdout.trim()
        );
    } catch {
        return undefined;

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}

function createUnlockedPrivateKeyCopy(
    bytes: Uint8Array,
    password: string
): string | undefined {

    const temporaryDirectory = createTemporaryDirectory("sato-ssh-unlock-");
    const privateKeyPath = path.join(temporaryDirectory, "private-key");

    try {
        fs.writeFileSync(privateKeyPath, Buffer.from(bytes), {mode: 0o600});

        const result = spawnSync(
            "ssh-keygen",
            ["-p", "-P", password, "-N", "", "-f", privateKeyPath],
            {encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true}
        );

        if (result.error || result.status !== 0 ) {
            return undefined;
        }

        const privateKey = fs.readFileSync(privateKeyPath, "utf8").trim();

        if (!privateKey.startsWith("-----BEGIN ")) {
            return undefined;
        }

        return `${privateKey}\n`;

    } catch {
        return undefined;

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}

function parsePublicKey(
    publicKey: string
): SshPublicKeyInfo | undefined {
    const parts = publicKey.trim().split(/\s+/);

    if (parts.length < 2) {return undefined;}

    const algorithm = formatSshAlgorithm(parts[0]);
    const encodedKey = parts[1];

    let keyBlob: Buffer;

    try {
        keyBlob = Buffer.from(encodedKey, "base64");

    } catch {
        return undefined;
    }

    if (!keyBlob.length) {return undefined;}

    const fingerprint = crypto.createHash("sha256").update(keyBlob).digest("base64").replace(/=+$/, "");

    return {
        algorithm,
        comment: parts.slice(2).join(" "),
        fingerprint: `SHA256:${fingerprint}`,
        keySize: keySizeFromPublicBlob(parts[0], keyBlob)
    };
}

function keySizeFromPublicBlob(
    algorithm: string,
    keyBlob: Buffer
): string {
    if (algorithm === "ssh-ed25519") {return "256 bits";}
    if (algorithm === "ecdsa-sha2-nistp256" ) {return "256 bits";}
    if (algorithm === "ecdsa-sha2-nistp384") {return "384 bits";}
    if (algorithm === "ecdsa-sha2-nistp521") {return "521 bits";}
    if (algorithm !== "ssh-rsa") {return "";}

    try {
        let offset = 0;

        const type = readBinaryString(keyBlob, offset);
        offset = type.nextOffset;

        const exponent = readBinaryString(keyBlob, offset);
        offset = exponent.nextOffset;

        const modulus = readBinaryString(keyBlob, offset).value;
        const normalizedModulus = modulus[0] === 0 ? modulus.subarray(1) : modulus;

        if (!normalizedModulus.length) {
            return "";
        }

        const firstByte = normalizedModulus[0];
        const leadingZeroBits = Math.clz32(firstByte) - 24;
        const bitLength = normalizedModulus.length * 8 - leadingZeroBits;

        return `${bitLength} bits`;
    } catch {
        return "";
    }
}

function readBinaryString(
    buffer: Buffer,
    offset: number
): {
    value: Buffer;
    nextOffset: number;
} {
    if (offset + 4 > buffer.length) {
        throw new Error("Invalid SSH public key.");
    }

    const length = buffer.readUInt32BE(offset);
    const start = offset + 4;
    const end = start + length;

    if (end > buffer.length) {
        throw new Error("Invalid SSH public key.");
    }

    return {
        value: buffer.subarray(start, end), nextOffset: end
    };
}

function isEncryptedOpenSshKey(
    text: string
): boolean {
    if (!text.includes("-----BEGIN OPENSSH PRIVATE KEY-----")) {
        return (text.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----") || /Proc-Type:\s*4,ENCRYPTED/i.test(text));
    }

    try {
        const base64 = text
            .replace("-----BEGIN OPENSSH PRIVATE KEY-----","")
            .replace("-----END OPENSSH PRIVATE KEY-----","")
            .replace(/\s+/g, "");

        const decoded = Buffer.from(base64, "base64");
        const marker = Buffer.from("openssh-key-v1\0", "ascii");

        if (decoded.length < marker.length || !decoded.subarray(0, marker.length).equals(marker)) {
            return false;
        }

        const cipherName = readBinaryString(decoded, marker.length);

        return (
            cipherName.value.toString("utf8") !== "none");
    } catch {
        return false;
    }
}

function detectKeyFormat(
    text: string
): string {
    if (text.includes("-----BEGIN OPENSSH PRIVATE KEY-----")) {return "OpenSSH";}
    if (text.includes("-----BEGIN RSA PRIVATE KEY-----")) {return "PEM RSA";}
    if (text.includes("-----BEGIN EC PRIVATE KEY-----")) {return "PEM EC";}
    if (text.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----")) {return "PKCS#8 PEM";}
    if (text.includes("-----BEGIN PRIVATE KEY-----")) {return "PKCS#8 PEM";}

    return "PEM";
}
