import * as crypto from "crypto";
import { sshAlgorithmFromFilePath } from "../sshFormat";
import { normalizeAlgorithm, sha256Hex } from "../format";

import { fileMetadata } from "../fileMetadata";
import type { CryptoInspection } from "../types";

export function inspectPrivateKey(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const openSsh = text.includes("-----BEGIN OPENSSH PRIVATE KEY-----");

    if (openSsh) {
        return inspectOpenSshPrivateKey(text, bytes, filePath);
    }

    const encrypted = text.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----") || /Proc-Type:\s*4,ENCRYPTED/i.test(text);

    try {
        const key = crypto.createPrivateKey(text);
        const publicKey = crypto.createPublicKey(key);
        const publicDer = publicKey.export({type: "spki", format: "der"}) as Buffer;

        const details =
            key.asymmetricKeyDetails as
                | { modulusLength?: number; namedCurve?: string; }
                | undefined;

        return {
            values: {
                Type: "Private Key",
                Status: "Unlocked",
                Protection: "None",
                Algorithm: normalizeAlgorithm(key.asymmetricKeyType || ""),
                "Key size": details?.modulusLength ? `${details.modulusLength} bits` : "",
                Curve: details?.namedCurve || "",
                "Public key SHA-256": sha256Hex(publicDer),
                ...fileMetadata(bytes, filePath),
                Summary: "Private key detected. Raw private key content is hidden."
            },
            privateKeyPem: text
        };
    } catch {
        return {
            values: {
                Type: "Private Key",
                Status: encrypted ? "Locked" : "Unsupported",
                Protection: encrypted ? "Password encrypted" : "",
                Summary: encrypted
                    ? "Encrypted private key detected. The key must be unlocked before its metadata or contents can be displayed."
                    : "Private key detected, but parsing failed. The key format may be unsupported.",
                ...fileMetadata(bytes, filePath)
            }
        };
    }
}

function inspectOpenSshPrivateKey(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const encrypted = isEncryptedOpenSshPrivateKey(text);

    return {
        values: {
            Type: "OpenSSH Private Key",
            Status: encrypted ? "Locked" : "Detected",
            Protection: encrypted ? "Password encrypted" : "None",
            Algorithm: sshAlgorithmFromFilePath(filePath),
            Format: "OpenSSH",
            Summary: encrypted
                ? "Encrypted OpenSSH private key detected. Enter the password to inspect the key."
                : "OpenSSH private key detected. Raw private key content is hidden.",
            ...fileMetadata(bytes, filePath),
        }
    };
}

function isEncryptedOpenSshPrivateKey(
    text: string
): boolean {
    try {
        const base64 = text.replace("-----BEGIN OPENSSH PRIVATE KEY-----", "").replace("-----END OPENSSH PRIVATE KEY-----", "").replace(/\s+/g, "");
        const decoded = Buffer.from(base64, "base64");
        const marker = Buffer.from("openssh-key-v1\0", "ascii");

        if (decoded.length <= marker.length || !decoded.subarray(0, marker.length).equals(marker)) {
            return false;
        }

        const cipherName = readOpenSshString(decoded, marker.length);

        return cipherName.value !== "none";
    } catch {
        return false;
    }
}

function readOpenSshString(
    buffer: Buffer,
    offset: number
): {
    value: string;
    nextOffset: number;
} {
    if (offset + 4 > buffer.length) {
        throw new Error("Invalid OpenSSH key.");
    }

    const length = buffer.readUInt32BE(offset);
    const start = offset + 4;
    const end = start + length;

    if (end > buffer.length) {
        throw new Error("Invalid OpenSSH key.");
    }

    return {
        value: buffer.subarray(start,end).toString("utf8"),
        nextOffset: end
    };
}
