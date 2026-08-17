import * as crypto from "crypto";

import type { CryptoInspection } from "../types";

import {
    extractOpenSslValue,
    normalizeAlgorithm,
    normalizeSignatureAlgorithm,
    sha256Hex
} from "../format";

import {
    tryInspectCsrWithOpenSsl
} from "../cli";

export function inspectPemCryptoFile(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    if (text.includes("-----BEGIN CERTIFICATE-----")) {
        return {
            values: inspectCertificate(text, bytes, filePath)
        };
    }

    if (
        text.includes("-----BEGIN CERTIFICATE REQUEST-----") ||
        text.includes("-----BEGIN NEW CERTIFICATE REQUEST-----")
    ) {
        return {
            values: inspectCsr(text, bytes, filePath)
        };
    }

    if (
        text.includes("-----BEGIN PRIVATE KEY-----") ||
        text.includes("-----BEGIN RSA PRIVATE KEY-----") ||
        text.includes("-----BEGIN EC PRIVATE KEY-----") ||
        text.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----")
    ) {
        return inspectPrivateKey(text, bytes, filePath);
    }

    return {
        values: {
            Type: "Unknown crypto file",
            Summary: "Unsupported or unrecognized PEM/DER content.",
            "File path": filePath,
            "SHA-256": sha256Hex(bytes)
        }
    };
}

export function inspectCertificate(
    text: string,
    bytes: Uint8Array,
    filePath: string
): Record<string, string> {
    try {
        const cert = new crypto.X509Certificate(text);

        return {
            Type: "X.509 Certificate",
            Subject: cert.subject,
            Issuer: cert.issuer,
            "Serial number": cert.serialNumber,
            "Valid from": cert.validFrom,
            "Valid to": cert.validTo,
            "Subject alternative names": cert.subjectAltName || "",
            "Public key algorithm": normalizeAlgorithm(
                cert.publicKey.asymmetricKeyType || ""
            ),
            "Fingerprint SHA-256": cert.fingerprint256,
            "Fingerprint SHA-1": cert.fingerprint,
            "File path": filePath,
            Summary: [
                cert.subject,
                `Issued by: ${cert.issuer}`,
                `Valid: ${cert.validFrom} - ${cert.validTo}`
            ].join("\n")
        };
    } catch {
        return {
            Type: "Certificate",
            Summary: "Certificate detected, but parsing failed.",
            "File path": filePath,
            "SHA-256": sha256Hex(bytes)
        };
    }
}

export function inspectPrivateKey(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    try {
        const key = crypto.createPrivateKey(text);
        const publicKey = crypto.createPublicKey(key);

        const publicDer = publicKey.export({
            type: "spki",
            format: "der"
        }) as Buffer;

        const details = key.asymmetricKeyDetails as
            | {
                  modulusLength?: number;
                  namedCurve?: string;
              }
            | undefined;

        return {
            values: {
                Type: "Private Key",
                Algorithm: normalizeAlgorithm(key.asymmetricKeyType || ""),
                "Key size": details?.modulusLength
                    ? `${details.modulusLength} bits`
                    : "",
                Curve: details?.namedCurve || "",
                "Public key SHA-256": sha256Hex(publicDer),
                "File path": filePath,
                Summary: "Private key detected. Raw private key content is hidden."
            },
            privateKeyPem: text
        };
    } catch {
        return {
            values: {
                Type: "Private Key",
                Summary: "Private key detected, but parsing failed. It may be encrypted or unsupported.",
                "File path": filePath,
                "SHA-256": sha256Hex(bytes)
            },
            privateKeyPem: text
        };
    }
}

export function inspectCsr(
    text: string,
    bytes: Uint8Array,
    filePath: string
): Record<string, string> {
    const pemType = text.includes("NEW CERTIFICATE REQUEST")
        ? "NEW CERTIFICATE REQUEST"
        : "CERTIFICATE REQUEST";

    const openssl = tryInspectCsrWithOpenSsl(text);
    const hash = sha256Hex(bytes);

    if (!openssl?.Details) {
        return {
            Type: "Certificate Signing Request",
            "PEM block": pemType,
            "File path": filePath,
            "SHA-256": hash,
            Summary: "CSR detected."
        };
    }

    const details = openssl.Details;

    const subject = extractOpenSslValue(
        details,
        /Subject:\s*(.+)/i
    );

    const publicKeyAlgorithm = normalizeAlgorithm(
        extractOpenSslValue(
            details,
            /Public Key Algorithm:\s*([^\r\n]+)/i
        )
    );

    const keySize = extractOpenSslValue(
        details,
        /Public-Key:\s*\((\d+\s*bit)\)/i
    );

    const signatureAlgorithm = normalizeSignatureAlgorithm(
        extractOpenSslValue(
            details,
            /Signature Algorithm:\s*([^\r\n]+)/i
        )
    );

    const attributes = extractOpenSslValue(
        details,
        /Attributes:\s*([^\r\n]+)/i
    );

    const summary = [
        publicKeyAlgorithm || "CSR",
        keySize ? keySize.replace(" bit", "-bit") : "",
        subject ? `for ${subject}` : ""
    ]
        .filter(Boolean)
        .join(" ");

    return {
        Type: "Certificate Signing Request",
        "PEM block": pemType,
        Subject: subject,
        "Public Key Algorithm": publicKeyAlgorithm,
        "Key Size": keySize,
        "Signature Algorithm": signatureAlgorithm,
        Attributes: attributes,
        "File path": filePath,
        "SHA-256": hash,
        Summary: summary || "CSR parsed successfully."
    };
}
