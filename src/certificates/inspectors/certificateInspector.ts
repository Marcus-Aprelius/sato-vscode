import * as crypto from "crypto";
import { normalizeAlgorithm } from "../format";
import { fileMetadata } from "../fileMetadata";

export function inspectCertificate(
    certificateData: string | Uint8Array,
    bytes: Uint8Array,
    filePath: string
): Record<string, string> {
    try {
        const certificate = new crypto.X509Certificate(typeof certificateData === "string" ? certificateData : Buffer.from(certificateData));

        return {
            Type: "X.509 Certificate",
            Encoding: typeof certificateData === "string" ? "PEM" : "DER",
            Subject: certificate.subject,
            Issuer: certificate.issuer,
            "Serial number": certificate.serialNumber,
            "Valid from": certificate.validFrom,
            "Valid to": certificate.validTo,
            "Subject alternative names": certificate.subjectAltName || "",
            "Public key algorithm": normalizeAlgorithm(certificate.publicKey.asymmetricKeyType || ""),
            "Fingerprint SHA-256": certificate.fingerprint256,
            "Fingerprint SHA-1": certificate.fingerprint,
            ...fileMetadata(bytes, filePath),
            Summary: [certificate.subject, `Issued by: ${certificate.issuer}`, `Valid: ${certificate.validFrom} - ${certificate.validTo}`].join("\n")
        };
    } catch {
        return {
            Type: "Certificate",
            Encoding: isDerCertificatePath(filePath) ? "DER" : "PEM",
            Summary: "Certificate detected, but parsing failed.",
            ...fileMetadata(bytes,filePath)
        };
    }
}

export function isDerCertificatePath(
    filePath: string
): boolean {
    const lowerPath = filePath.toLowerCase();

    return (lowerPath.endsWith(".der") || lowerPath.endsWith(".cer"));
}
