import * as crypto from "crypto";
import type { CryptoInspection } from "../types";
import { normalizeAlgorithm, sha256Hex } from "../format";

export function inspectPkcs8(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const encoding = detectEncoding(bytes);
    const encrypted = detectEncryption(
        bytes,
        encoding
    );

    if (encrypted) {
        return lockedInspection(
            bytes,
            filePath,
            encoding
        );
    }

    try {
        const privateKey = createPrivateKey(
            bytes,
            encoding
        );

        return unlockedInspection(
            privateKey,
            bytes,
            filePath,
            encoding
        );
    } catch {
        return {
            values: {
                Type: "PKCS#8 Private Key",
                Encoding: encoding,
                Status: "Unsupported",
                Summary:
                    "PKCS#8 private key detected, but parsing failed. The key may be encrypted or unsupported.",
                "File path": filePath,
                "File size": `${bytes.length} bytes`,
                "SHA-256": sha256Hex(bytes)
            }
        };
    }
}

export function inspectPkcs8Unlocked(
    bytes: Uint8Array,
    filePath: string,
    password: string
): CryptoInspection {
    const encoding = detectEncoding(bytes);

    try {
        const privateKey = createPrivateKey(
            bytes,
            encoding,
            password
        );

        return unlockedInspection(
            privateKey,
            bytes,
            filePath,
            encoding,
            true
        );
    } catch {
        return {
            values: {
                Type: "PKCS#8 Private Key",
                Encoding: encoding,
                Status: "Unlock failed",
                Summary:
                    "Failed to unlock PKCS#8 private key. The password may be incorrect or the key format may be unsupported.",
                "File path": filePath,
                "File size": `${bytes.length} bytes`,
                "SHA-256": sha256Hex(bytes)
            }
        };
    }
}

function createPrivateKey(
    bytes: Uint8Array,
    encoding: "PEM" | "DER",
    password?: string
): crypto.KeyObject {
    const key = Buffer.from(bytes);

    if (encoding === "PEM") {
        return crypto.createPrivateKey({
            key,
            format: "pem",
            passphrase: password
        });
    }

    return crypto.createPrivateKey({
        key,
        format: "der",
        type: "pkcs8",
        passphrase: password
    });
}

function unlockedInspection(
    privateKey: crypto.KeyObject,
    bytes: Uint8Array,
    filePath: string,
    encoding: "PEM" | "DER",
    passwordEncrypted = false
): CryptoInspection {
    const publicKey =
        crypto.createPublicKey(privateKey);

    const publicDer = publicKey.export({
        type: "spki",
        format: "der"
    }) as Buffer;

    const details =
        privateKey.asymmetricKeyDetails as
            | {
                  modulusLength?: number;
                  namedCurve?: string;
              }
            | undefined;

    const privateKeyPem =
        exportPrivateKeyPem(privateKey);

    const algorithm = normalizeAlgorithm(
        privateKey.asymmetricKeyType || ""
    );

    const keySize = details?.modulusLength
        ? `${details.modulusLength} bits`
        : "";

    const curve =
        details?.namedCurve || "";

    const summaryParts = [
        algorithm || "PKCS#8",
        keySize,
        curve,
        "private key"
    ].filter(Boolean);

    return {
        values: {
            Protection: passwordEncrypted
                ? "Password encrypted"
                : "",
            Type: "PKCS#8 Private Key",
            Encoding: encoding,
            Status: "Unlocked",
            Algorithm: algorithm,
            "Key size": keySize,
            Curve: curve,
            "Public key SHA-256":
                sha256Hex(publicDer),
            "File path": filePath,
            "File size": `${bytes.length} bytes`,
            "SHA-256": sha256Hex(bytes),
            Summary:
                `${summaryParts.join(" ")}. Raw private key content is hidden.`
        },
        privateKeyPem
    };
}

function lockedInspection(
    bytes: Uint8Array,
    filePath: string,
    encoding: "PEM" | "DER"
): CryptoInspection {
    return {
        values: {
            Type: "PKCS#8 Private Key",
            Encoding: encoding,
            Status: "Locked",
            Protection: "Password encrypted",
            Summary:
                "Encrypted PKCS#8 private key detected. Enter the password to inspect the key.",
            "File path": filePath,
            "File size": `${bytes.length} bytes`,
            "SHA-256": sha256Hex(bytes)
        }
    };
}

function exportPrivateKeyPem(
    privateKey: crypto.KeyObject
): string {
    const exported = privateKey.export({
        type: "pkcs8",
        format: "pem"
    });

    return typeof exported === "string"
        ? exported
        : exported.toString("utf8");
}

function detectEncoding(
    bytes: Uint8Array
): "PEM" | "DER" {
    const prefix = Buffer.from(bytes)
        .subarray(
            0,
            Math.min(
                bytes.length,
                256
            )
        )
        .toString("ascii");

    return prefix.includes(
        "-----BEGIN"
    )
        ? "PEM"
        : "DER";
}

function detectEncryption(
    bytes: Uint8Array,
    encoding: "PEM" | "DER"
): boolean {
    if (encoding === "PEM") {
        const text =
            Buffer.from(bytes).toString(
                "ascii"
            );

        return text.includes(
            "-----BEGIN ENCRYPTED PRIVATE KEY-----"
        );
    }

    try {
        createPrivateKey(
            bytes,
            encoding
        );

        return false;
    } catch {
        return true;
    }
}
