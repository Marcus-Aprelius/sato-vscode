import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import { spawnSync } from "child_process";
import { normalizeAlgorithm, sha256Hex } from "../format";

import type { CryptoInspection } from "../types";

export function inspectPkcs7(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const encoding = detectEncoding(bytes);
    const hash = sha256Hex(bytes);

    const output = inspectWithOpenSsl(
        bytes,
        encoding
    );

    if (!output) {
        return {
            values: {
                Type: "PKCS#7 Certificate Chain",
                Encoding: encoding,
                Status: "Inspection unavailable",
                Summary:
                    "PKCS#7 certificate container detected. OpenSSL is required to inspect the certificate chain.",
                "File path": filePath,
                "File size": `${bytes.length} bytes`,
                "SHA-256": hash
            }
        };
    }

    const certificates =
        extractCertificates(output);

    if (certificates.length === 0) {
        return {
            values: {
                Type: "PKCS#7 Certificate Chain",
                Encoding: encoding,
                Status: "No certificates found",
                "Certificate count": "0",
                Summary:
                    "PKCS#7 container parsed, but no X.509 certificates were found.",
                "File path": filePath,
                "File size": `${bytes.length} bytes`,
                "SHA-256": hash
            }
        };
    }

    const parsedCertificates =
        certificates
            .map(parseCertificate)
            .filter(
                (
                    certificate
                ): certificate is ParsedCertificate =>
                    certificate !== undefined
            );

    if (parsedCertificates.length === 0) {
        return {
            values: {
                Type: "PKCS#7 Certificate Chain",
                Encoding: encoding,
                Status: "Parsed",
                "Certificate count":
                    String(certificates.length),
                Summary:
                    `PKCS#7 container contains ${certificates.length} certificate(s), but certificate metadata could not be parsed.`,
                "File path": filePath,
                "File size": `${bytes.length} bytes`,
                "SHA-256": hash
            }
        };
    }

    const subjects = parsedCertificates
        .map(
            (certificate) =>
                certificate.subject
        )
        .filter(Boolean);

    const issuers = parsedCertificates
        .map(
            (certificate) =>
                certificate.issuer
        )
        .filter(Boolean);

    const values: Record<string, string> = {
        Type: "PKCS#7 Certificate Chain",
        Encoding: encoding,
        Status: "Parsed",
        "Certificate count":
            String(parsedCertificates.length),
        Subjects: subjects.join("\n"),
        Issuers: issuers.join("\n"),
        "File path": filePath,
        "File size": `${bytes.length} bytes`,
        "SHA-256": hash,
        Summary:
            `PKCS#7 certificate chain containing ${parsedCertificates.length} certificate(s).`
    };

    const firstCertificate =
        parsedCertificates[0];

    values.Subject =
        firstCertificate.subject;

    values.Issuer =
        firstCertificate.issuer;

    values["Serial number"] =
        firstCertificate.serialNumber;

    values["Valid from"] =
        firstCertificate.validFrom;

    values["Valid to"] =
        firstCertificate.validTo;

    values["Public key algorithm"] =
        firstCertificate.publicKeyAlgorithm;

    values["Fingerprint SHA-256"] =
        firstCertificate.fingerprint256;

    for (
        let index = 0;
        index < parsedCertificates.length;
        index++
    ) {
        const certificate =
            parsedCertificates[index];

        const number = index + 1;

        values[
            `Certificate ${number} subject`
        ] = certificate.subject;

        values[
            `Certificate ${number} issuer`
        ] = certificate.issuer;

        values[
            `Certificate ${number} serial number`
        ] = certificate.serialNumber;

        values[
            `Certificate ${number} valid from`
        ] = certificate.validFrom;

        values[
            `Certificate ${number} valid to`
        ] = certificate.validTo;

        values[
            `Certificate ${number} fingerprint SHA-256`
        ] = certificate.fingerprint256;
    }

    return {
        values
    };
}

interface ParsedCertificate {
    subject: string;
    issuer: string;
    serialNumber: string;
    validFrom: string;
    validTo: string;
    publicKeyAlgorithm: string;
    fingerprint256: string;
}

function inspectWithOpenSsl(
    bytes: Uint8Array,
    encoding: "PEM" | "DER"
): string | undefined {
    const temporaryDirectory =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "sato-pkcs7-"
            )
        );

    const inputPath = path.join(
        temporaryDirectory,
        "container.p7b"
    );

    try {
        fs.writeFileSync(
            inputPath,
            Buffer.from(bytes)
        );

        const result = spawnSync(
            "openssl",
            [
                "pkcs7",
                "-inform",
                encoding,
                "-in",
                inputPath,
                "-print_certs"
            ],
            {
                encoding: "utf8",
                maxBuffer:
                    16 * 1024 * 1024,
                windowsHide: true
            }
        );

        if (
            result.error ||
            result.status !== 0 ||
            !result.stdout
        ) {
            return undefined;
        }

        return result.stdout;
    } catch {
        return undefined;
    } finally {
        try {
            fs.rmSync(
                temporaryDirectory,
                {
                    recursive: true,
                    force: true
                }
            );
        } catch {
            // Ignore temporary file cleanup errors.
        }
    }
}

function extractCertificates(
    output: string
): string[] {
    return output.match(
        /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g
    ) || [];
}

function parseCertificate(
    pem: string
): ParsedCertificate | undefined {
    try {
        const certificate =
            new crypto.X509Certificate(pem);

        return {
            subject:
                certificate.subject,
            issuer:
                certificate.issuer,
            serialNumber:
                certificate.serialNumber,
            validFrom:
                certificate.validFrom,
            validTo:
                certificate.validTo,
            publicKeyAlgorithm:
                normalizeAlgorithm(
                    certificate.publicKey
                        .asymmetricKeyType || ""
                ),
            fingerprint256:
                certificate.fingerprint256
        };
    } catch {
        return undefined;
    }
}

function detectEncoding(
    bytes: Uint8Array
): "PEM" | "DER" {
    const text = Buffer.from(bytes)
        .subarray(0, 128)
        .toString("ascii");

    return text.includes(
        "-----BEGIN"
    )
        ? "PEM"
        : "DER";
}
