import { tryInspectCsrWithOpenSsl } from "../cli";
import { fileMetadata } from "../fileMetadata";

import {
    extractOpenSslValue,
    normalizeAlgorithm,
    normalizeSignatureAlgorithm
} from "../format";

export function inspectCsr(
    text: string,
    bytes: Uint8Array,
    filePath: string
): Record<string, string> {
    const isPem = text.includes("-----BEGIN CERTIFICATE REQUEST-----") || text.includes("-----BEGIN NEW CERTIFICATE REQUEST-----");
    const pemType = text.includes("NEW CERTIFICATE REQUEST") ? "NEW CERTIFICATE REQUEST" : isPem ? "CERTIFICATE REQUEST" : "DER";
    const openssl = tryInspectCsrWithOpenSsl(isPem ? text : bytes, isPem ? "PEM" : "DER");

    if (!openssl?.Details) {
        return {
            Type: "Certificate Signing Request",
            Encoding: isPem ? "PEM" : "DER",
            "PEM block": pemType,
            ...fileMetadata(bytes, filePath),
            Summary: "CSR detected, but OpenSSL inspection failed."
        };
    }

    const details = openssl.Details;
    const subject = extractOpenSslValue(details, /Subject:\s*(.+)/i);
    const publicKeyAlgorithm = normalizeAlgorithm(extractOpenSslValue(details, /Public Key Algorithm:\s*([^\r\n]+)/i));
    const keySize = extractOpenSslValue(details, /Public-Key:\s*\((\d+\s*bit)\)/i);
    const signatureAlgorithm = normalizeSignatureAlgorithm(extractOpenSslValue(details,/Signature Algorithm:\s*([^\r\n]+)/i));
    const attributes = extractOpenSslValue(details, /Attributes:\s*([^\r\n]+)/i);

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
        ...fileMetadata(bytes, filePath),
        Summary: summary || "CSR parsed successfully."
    };
}
