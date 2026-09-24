import * as crypto from "crypto";
import { fileMetadata } from "../fileMetadata";
import { inspectPrivateKey } from "./privateKeyInspector";

import type { CryptoInspection } from "../types";

export function inspectRsaKey(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    if (text.includes("-----BEGIN RSA PRIVATE KEY-----") ||
        text.includes("-----BEGIN PRIVATE KEY-----") ||
        text.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----")
    ) {
        return inspectPrivateKey(text, bytes, filePath);
    }

    const pemPublicKey = inspectPemPublicKey(text, bytes, filePath);

    if (pemPublicKey) {
        return pemPublicKey;
    }

    const derPrivateKey = inspectDerPrivateKey(bytes, filePath);

    if (derPrivateKey) {
        return derPrivateKey;
    }

    const derPublicKey = inspectDerPublicKey(bytes, filePath);

    if (derPublicKey) {
        return derPublicKey;
    }

    return {
        values: {
            Type: "RSA Key",
            Status: "Unsupported",
            Summary: "The file is not a recognized RSA private or public key.",
            ...fileMetadata(bytes, filePath)
        }
    };
}

function inspectPemPublicKey(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection | undefined {
    if (!text.includes("-----BEGIN PUBLIC KEY-----") && !text.includes("-----BEGIN RSA PUBLIC KEY-----")) {
        return undefined;
    }

    try {
        const key = crypto.createPublicKey(text);

        return buildPublicKeyInspection(key, bytes, filePath, "PEM");
    } catch {
        return undefined;
    }
}

function inspectDerPrivateKey(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection | undefined {
    const buffer = Buffer.from(bytes);

    for (const type of ["pkcs1", "pkcs8"] as const) {
        try {
            const key = crypto.createPrivateKey({key: buffer, format: "der", type});

            if (key.asymmetricKeyType !== "rsa") {
                continue;
            }

            const exported = key.export({format: "pem", type: "pkcs8"});

            return {
                values: {
                    Type: "RSA Private Key",
                    Encoding: "DER",
                    Format: type === "pkcs1" ? "PKCS#1" : "PKCS#8",
                    Status: "Parsed",
                    Algorithm: "RSA",
                    "Key size": readKeySize(key),
                    ...fileMetadata(bytes, filePath),
                    Summary: `RSA private key in DER ${type.toUpperCase()} format detected.`
                },
                privateKeyPem: typeof exported === "string" ? exported : exported.toString("utf8")
            };
        } catch {
            // Try the next DER format.
        }
    }

    return undefined;
}

function inspectDerPublicKey(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection | undefined {
    const buffer = Buffer.from(bytes);

    for (const type of ["spki", "pkcs1"] as const) {
        try {
            const key = crypto.createPublicKey({key: buffer, format: "der", type});

            if (key.asymmetricKeyType !== "rsa") {
                continue;
            }

            return buildPublicKeyInspection(key, bytes, filePath, type === "spki" ? "DER SPKI" : "DER PKCS#1");
        } catch {
            // Try the next DER format.
        }
    }

    return undefined;
}

function buildPublicKeyInspection(
    key: crypto.KeyObject,
    bytes: Uint8Array,
    filePath: string,
    encoding: string
): CryptoInspection {
    const publicDer = key.export({format: "der", type: "spki"}) as Buffer;
    const fingerprint = crypto.createHash("sha256").update(publicDer).digest("hex");

    return {
        values: {
            Type: "RSA Public Key",
            Encoding: encoding,
            Status: "Parsed",
            Algorithm: "RSA",
            "Key size": readKeySize(key),
            "Public key SHA-256": fingerprint, ...fileMetadata(bytes, filePath),
            Summary: `RSA public key in ${encoding} format.`
        }
    };
}

function readKeySize(
    key: crypto.KeyObject
): string {
    const details =
        key.asymmetricKeyDetails as
            | {modulusLength?: number;}
            | undefined;

    return details?.modulusLength ? `${details.modulusLength} bits` : "";
}
