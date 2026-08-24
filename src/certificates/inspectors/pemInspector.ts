import * as crypto from "crypto";
import { tryInspectCsrWithOpenSsl } from "../cli";

import type { CryptoInspection } from "../types";

import {
    extractOpenSslValue,
    normalizeAlgorithm,
    normalizeSignatureAlgorithm,
    sha256Hex
} from "../format";

export function inspectPemCryptoFile(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    if (text.includes("-----BEGIN CERTIFICATE-----")) {
        return {
            values: inspectCertificate(
                text,
                bytes,
                filePath
            )
        };
    }

    if (
        text.includes("-----BEGIN CERTIFICATE REQUEST-----") ||
        text.includes("-----BEGIN NEW CERTIFICATE REQUEST-----") ||
        filePath.toLowerCase().endsWith(".p10")
    ) {
        return {
            values: inspectCsr(
                text,
                bytes,
                filePath
            )
        };
    }

    if (
        text.includes("-----BEGIN PRIVATE KEY-----") ||
        text.includes("-----BEGIN RSA PRIVATE KEY-----") ||
        text.includes("-----BEGIN EC PRIVATE KEY-----") ||
        text.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----") ||
        text.includes("-----BEGIN OPENSSH PRIVATE KEY-----")
    ) {
        return inspectPrivateKey(
            text,
            bytes,
            filePath
        );
    }

    if (isDerCertificatePath(filePath)) {
        return {
            values: inspectCertificate(
                bytes,
                bytes,
                filePath
            )
        };
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
    certificateData: string | Uint8Array,
    bytes: Uint8Array,
    filePath: string
): Record<string, string> {
    try {
        const cert = new crypto.X509Certificate(
            typeof certificateData === "string"
                ? certificateData
                : Buffer.from(certificateData)
        );

        return {
            Type: "X.509 Certificate",
            Encoding: typeof certificateData === "string" ? "PEM" : "DER",
            Subject: cert.subject,
            Issuer: cert.issuer,
            "Serial number": cert.serialNumber,
            "Valid from": cert.validFrom,
            "Valid to": cert.validTo,
            "Subject alternative names": cert.subjectAltName || "",
            "Public key algorithm": normalizeAlgorithm(cert.publicKey.asymmetricKeyType || ""),
            "Fingerprint SHA-256": cert.fingerprint256,
            "Fingerprint SHA-1": cert.fingerprint,
            "File path": filePath,
            "File size": `${bytes.length} bytes`,
            "SHA-256": sha256Hex(bytes),
            Summary: [
                cert.subject,
                `Issued by: ${cert.issuer}`,
                `Valid: ${cert.validFrom} - ${cert.validTo}`
            ].join("\n")
        };
    } catch {
        return {
            Type: "Certificate",
            Encoding: isDerCertificatePath(filePath) ? "DER" : "PEM",
            Summary: "Certificate detected, but parsing failed.",
            "File path": filePath,
            "File size": `${bytes.length} bytes`,
            "SHA-256": sha256Hex(bytes)
        };
    }
}

export function inspectPrivateKey(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const openSsh =
        text.includes(
            "-----BEGIN OPENSSH PRIVATE KEY-----"
        );

    if (openSsh) {
        return inspectOpenSshPrivateKey(
            text,
            bytes,
            filePath
        );
    }

    const encrypted =
        text.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----") ||
        /Proc-Type:\s*4,ENCRYPTED/i.test(text);

    try {
        const key = crypto.createPrivateKey(text);
        const publicKey = crypto.createPublicKey(key);
        const publicDer = publicKey.export({type: "spki",format: "der"}) as Buffer;

        const details =
            key.asymmetricKeyDetails as
                | {
                      modulusLength?: number;
                      namedCurve?: string;
                  }
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
                "File path": filePath,
                "File size": `${bytes.length} bytes`,
                "SHA-256": sha256Hex(bytes),
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
                "File path": filePath,
                "File size": `${bytes.length} bytes`,
                "SHA-256": sha256Hex(bytes)
            }
        };
    }
}

export function inspectCsr(
    text: string,
    bytes: Uint8Array,
    filePath: string
): Record<string, string> {
    const isPem =
        text.includes("-----BEGIN CERTIFICATE REQUEST-----") ||
        text.includes("-----BEGIN NEW CERTIFICATE REQUEST-----");

    const pemType = text.includes(
        "NEW CERTIFICATE REQUEST"
    )
        ? "NEW CERTIFICATE REQUEST"
        : isPem
            ? "CERTIFICATE REQUEST"
            : "DER";

    const openssl =
        tryInspectCsrWithOpenSsl(
            isPem
                ? text
                : bytes,
            isPem
                ? "PEM"
                : "DER"
        );

    const hash = sha256Hex(bytes);

    if (!openssl?.Details) {
        return {
            Type: "Certificate Signing Request",
            Encoding: isPem ? "PEM" : "DER",
            "PEM block": pemType,
            "File path": filePath,
            "File size": `${bytes.length} bytes`,
            "SHA-256": hash,
            Summary: "CSR detected, but OpenSSL inspection failed."
        };
    }

    const details = openssl.Details;

    const subject = extractOpenSslValue(details, /Subject:\s*(.+)/i);

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
        Encoding: isPem ? "PEM" : "DER",
        "PEM block": pemType,
        Subject: subject,
        "Public Key Algorithm": publicKeyAlgorithm,
        "Key Size": keySize,
        "Signature Algorithm": signatureAlgorithm,
        Attributes: attributes,
        "File path": filePath,
        "File size": `${bytes.length} bytes`,
        "SHA-256": hash,
        Summary: summary || "CSR parsed successfully."
    };
}

function isDerCertificatePath(
    filePath: string
): boolean {
    const lowerPath = filePath.toLowerCase();

    return (lowerPath.endsWith(".der") || lowerPath.endsWith(".cer"));
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
            "File path": filePath,
            "File size": `${bytes.length} bytes`,
            "SHA-256": sha256Hex(bytes)
        }
    };
}

function sshAlgorithmFromFilePath(
    filePath: string
): string {
    const normalizedPath =
        filePath
            .replace(/\\/g, "/")
            .toLowerCase();

    const fileName =
        normalizedPath
            .split("/")
            .pop() || "";

    switch (fileName) {
        case "id_rsa":
            return "RSA";

        case "id_ecdsa":
            return "ECDSA";

        case "id_ed25519":
            return "Ed25519";

        default:
            return "SSH";
    }
}

function isEncryptedOpenSshPrivateKey(
    text: string
): boolean {
    try {
        const base64 = text
            .replace(
                "-----BEGIN OPENSSH PRIVATE KEY-----",
                ""
            )
            .replace(
                "-----END OPENSSH PRIVATE KEY-----",
                ""
            )
            .replace(/\s+/g, "");

        const decoded =
            Buffer.from(
                base64,
                "base64"
            );

        const marker =
            Buffer.from(
                "openssh-key-v1\0",
                "ascii"
            );

        if (
            decoded.length <= marker.length ||
            !decoded
                .subarray(
                    0,
                    marker.length
                )
                .equals(marker)
        ) {
            return false;
        }

        let offset = marker.length;

        const cipherName =
            readOpenSshString(
                decoded,
                offset
            );

        return (
            cipherName.value !== "none"
        );
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
        value: buffer
            .subarray(start, end )
            .toString("utf8"),
        nextOffset: end
    };
}