import * as crypto from "crypto";
import { fileMetadata } from "../fileMetadata";
import type { CryptoInspection } from "../types";

export function inspectOpenSshPublicKey(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const text = Buffer.from(bytes).toString("utf8").trim();
    const parts = text.split(/\s+/);

    if (parts.length < 2) {
        return unsupportedPublicKey(bytes, filePath);
    }

    const keyType = parts[0];
    const encodedKey = parts[1];
    const comment = parts.slice(2).join(" ");

    if (!isSupportedOpenSshKeyType(keyType)) {
        return unsupportedPublicKey(bytes, filePath);
    }

    let keyBlob: Buffer;

    try {
        keyBlob = Buffer.from(encodedKey, "base64");

    } catch {
        return invalidPublicKey(bytes, filePath);
    }

    if (keyBlob.length === 0 || !isValidBase64(encodedKey)) {
        return invalidPublicKey(bytes, filePath);
    }

    const embeddedType = readSshString(keyBlob);

    if (!embeddedType || embeddedType !== keyType) {
        return invalidPublicKey(bytes, filePath);
    }

    const fingerprint = crypto.createHash("sha256").update(keyBlob).digest("base64").replace(/=+$/, "");

    const values: Record<string, string> = {
        Type: "OpenSSH Public Key",
        Encoding: "OpenSSH",
        Status: "Parsed",
        Algorithm: displayAlgorithm(keyType),
        "Key type": keyType,
        "Fingerprint SHA-256": `SHA256:${fingerprint}`,
        ...fileMetadata(bytes, filePath),
        Summary: `${displayAlgorithm(keyType)} OpenSSH public key.`
    };

    if (comment) {
        values.Comment = comment;
    }

    return {
        values
    };
}

function isSupportedOpenSshKeyType(
    value: string
): boolean {
    return (value === "ssh-rsa" || value === "ssh-ed25519" || value.startsWith("ecdsa-sha2-"));
}

function displayAlgorithm(
    keyType: string
): string {
    if (keyType === "ssh-rsa") {
        return "RSA";
    }

    if (keyType === "ssh-ed25519") {
        return "Ed25519";
    }

    if (keyType.startsWith("ecdsa-sha2-")) {
        return "ECDSA";
    }

    return keyType;
}

function readSshString(
    buffer: Buffer
): string | undefined {
    if (buffer.length < 4) {
        return undefined;
    }

    const length = buffer.readUInt32BE(0);

    if (length <= 0 || 4 + length > buffer.length) {
        return undefined;
    }

    return buffer.subarray(4, 4 + length).toString("ascii");
}

function isValidBase64(
    value: string
): boolean {
    if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
        return false;
    }

    try {
        const normalizedInput = value.replace(/=+$/, "");
        const normalizedOutput = Buffer.from(value, "base64").toString("base64").replace(/=+$/, "");

        return (normalizedInput === normalizedOutput);

    } catch {
        return false;
    }
}

function unsupportedPublicKey(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    return {
        values: {
            Type: "Public Key",
            Status: "Unsupported",
            Summary: "The file is not a supported OpenSSH RSA, ECDSA, or Ed25519 public key.",
            ...fileMetadata(bytes, filePath)
        }
    };
}

function invalidPublicKey(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    return {
        values: {
            Type: "OpenSSH Public Key",
            Status: "Invalid",
            Summary: "The OpenSSH public key data is invalid or corrupted.",
            ...fileMetadata(bytes, filePath)
        }
    };
}
