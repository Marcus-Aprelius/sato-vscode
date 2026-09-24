import * as crypto from "crypto";
import { inspectCsr } from "./csrInspector";
import { fileMetadata } from "../fileMetadata";
import { inspectEcKey } from "./ecKeyInspector";
import { inspectRsaKey } from "./rsaKeyInspector";
import { inspectPrivateKey } from "./privateKeyInspector";
import { inspectCertificate, isDerCertificatePath } from "./certificateInspector";

import type { CryptoInspection } from "../types";

export function inspectPemCryptoFile(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    if (text.includes("-----BEGIN CERTIFICATE-----")) {
        return {values: inspectCertificate(text, bytes, filePath)};
    }

    if (text.includes("-----BEGIN CERTIFICATE REQUEST-----") || text.includes("-----BEGIN NEW CERTIFICATE REQUEST-----") || filePath.toLowerCase().endsWith(".p10")) {
        return {values: inspectCsr(text, bytes, filePath)};
    }

    if (text.includes("-----BEGIN RSA PRIVATE KEY-----") || text.includes("-----BEGIN RSA PUBLIC KEY-----")) {
        return inspectRsaKey(text, bytes, filePath);
    }

    if (text.includes("-----BEGIN EC PRIVATE KEY-----")) {
        return inspectEcKey(text, bytes, filePath);
    }

    if (text.includes("-----BEGIN PRIVATE KEY-----") || text.includes("-----BEGIN PUBLIC KEY-----")) {
        const keyType = detectPemKeyType(text);

        if (keyType === "rsa") {
            return inspectRsaKey(text, bytes, filePath);
        }

        if (keyType === "ec") {
            return inspectEcKey(text, bytes, filePath);
        }
    }

    if (text.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----") || text.includes("-----BEGIN OPENSSH PRIVATE KEY-----")) {
        return inspectPrivateKey(text, bytes, filePath);
    }

    if (isDerCertificatePath(filePath)) {
        return {values: inspectCertificate(bytes, bytes, filePath)};
    }

    return {
        values: {
            Type: "Unknown crypto file",
            Summary: "Unsupported or unrecognized PEM/DER content.",
            ...fileMetadata(bytes, filePath)
        }
    };
}

function detectPemKeyType(
    text: string
): "rsa" | "ec" | undefined {
    try {
        const key = text.includes("PRIVATE KEY-----") ? crypto.createPrivateKey(text) : crypto.createPublicKey(text);

        if (key.asymmetricKeyType === "rsa" || key.asymmetricKeyType === "ec") {
            return key.asymmetricKeyType;
        }

    } catch {
        return undefined;
    }

    return undefined;
}
