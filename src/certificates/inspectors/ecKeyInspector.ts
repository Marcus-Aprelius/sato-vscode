import * as crypto from "crypto";
import { fileMetadata } from "../fileMetadata";
import { inspectPrivateKey } from "./privateKeyInspector";

import type { CryptoInspection} from "../types";

export function inspectEcKey(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    if (text.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----")) {
        return inspectPrivateKey(text, bytes, filePath);
    }

    if (text.includes("-----BEGIN EC PRIVATE KEY-----")) {
        return inspectPemPrivateKey(text, bytes, filePath, "SEC1");
    }

    if (text.includes("-----BEGIN PRIVATE KEY-----")) {
        return inspectPemPrivateKey(text, bytes, filePath, "PKCS#8");
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
            Type: "EC Key",
            Status: "Unsupported",
            Summary: "The file is not a recognized EC private or public key.",
            ...fileMetadata(bytes, filePath)
        }
    };
}

function inspectPemPrivateKey(
    text: string,
    bytes: Uint8Array,
    filePath: string,
    format: "SEC1" | "PKCS#8"
): CryptoInspection {
    try {
        const key = crypto.createPrivateKey(text);

        if (key.asymmetricKeyType !== "ec") {
            throw new Error("Not an EC private key.");
        }

        const exported = key.export({format: "pem", type: "pkcs8"});

        return {
            values: {
                Type: "EC Private Key",
                Encoding: "PEM",
                Format: format,
                Status: "Parsed",
                Protection: "None",
                Algorithm: "EC",
                Curve: readCurve(key),
                "Public key SHA-256": publicKeyFingerprint(key),
                ...fileMetadata(bytes, filePath),
                Summary: `EC private key in PEM ${format} format detected.`
            },

            privateKeyPem: typeof exported === "string" ? exported : exported.toString("utf8")
        };

    } catch {
        return {
            values: {
                Type: "EC Private Key",
                Encoding: "PEM",
                Format: format,
                Status: "Invalid",
                Algorithm: "EC",
                Summary: "The EC private key is invalid or corrupted.",
                ...fileMetadata(bytes, filePath)
            }
        };
    }
}

function inspectPemPublicKey(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection | undefined {
    if (!text.includes("-----BEGIN PUBLIC KEY-----")) {
        return undefined;
    }

    try {
        const key = crypto.createPublicKey(text);

        if (key.asymmetricKeyType !== "ec") {
            return undefined;
        }

        return buildPublicKeyInspection(key, bytes, filePath, "PEM", "SPKI");

    } catch {
        return undefined;
    }
}

function inspectDerPrivateKey(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection | undefined {
    const buffer = Buffer.from(bytes);

    const formats = [
        {type: "pkcs8" as const, label: "PKCS#8"},
        {type: "sec1" as const, label: "SEC1"}
    ];

    for (const format of formats) {
        try {
            const key = crypto.createPrivateKey({key: buffer, format: "der", type: format.type});

            if (key.asymmetricKeyType !== "ec") {
                continue;
            }

            const exportedDer = key.export({format: "der", type: format.type}) as Buffer;

            if (!exportedDer.equals(buffer)) {
                continue;
            }

            const exportedPem = key.export({format: "pem", type: "pkcs8"});

            return {
                values: {
                    Type: "EC Private Key",
                    Encoding: "DER",
                    Format: format.label,
                    Status: "Parsed",
                    Protection: "None",
                    Algorithm: "EC",
                    Curve: readCurve(key),
                    "Public key SHA-256": publicKeyFingerprint(key),
                    ...fileMetadata(bytes, filePath),
                    Summary: `EC private key in DER ${format.label} format detected.`
                },

                privateKeyPem: typeof exportedPem === "string" ? exportedPem : exportedPem.toString("utf8")
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
    try {
        const key = crypto.createPublicKey({key: Buffer.from(bytes), format: "der", type: "spki"});

        if (key.asymmetricKeyType !== "ec") {
            return undefined;
        }

        return buildPublicKeyInspection(key, bytes, filePath, "DER", "SPKI");

    } catch {
        return undefined;
    }
}

function buildPublicKeyInspection(
    key: crypto.KeyObject,
    bytes: Uint8Array,
    filePath: string,
    encoding: string,
    format: string
): CryptoInspection {
    return {
        values: {
            Type: "EC Public Key",
            Encoding: encoding,
            Format: format,
            Status: "Parsed",
            Algorithm: "EC",
            Curve: readCurve(key),
            "Public key SHA-256": publicKeyFingerprint(key),
            ...fileMetadata(bytes, filePath),
            Summary: `EC public key in ${encoding} ${format} format.`
        }
    };
}

function publicKeyFingerprint(
    key: crypto.KeyObject
): string {
    const publicKey = key.type === "private" ? crypto.createPublicKey(key) : key;
    const publicDer = publicKey.export({format: "der", type: "spki"}) as Buffer;

    return crypto.createHash("sha256").update(publicDer).digest("hex");
}

function readCurve(
    key: crypto.KeyObject
): string {
    const details = key.asymmetricKeyDetails as | {namedCurve?: string;}| undefined;

    return details?.namedCurve || "";
}
