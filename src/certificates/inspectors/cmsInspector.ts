import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import { sha256Hex } from "../format";
import { spawnSync } from "child_process";

import type { CryptoInspection } from "../types";

export function inspectCms(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const encoding = detectEncoding(
        bytes
    );

    const hash = sha256Hex(bytes);

    const inspected = inspectWithOpenSsl(
        bytes,
        encoding,
        filePath
    );

    if (!inspected) {
        return {
            values: {
                Type: cmsDisplayType(
                    filePath
                ),
                Encoding: encoding,
                Status:
                    "Inspection unavailable",
                Summary:
                    "CMS/PKCS#7 file detected. OpenSSL is required to inspect this file.",
                "File path": filePath,
                "File size":
                    `${bytes.length} bytes`,
                "SHA-256": hash
            }
        };
    }

    const contentType =
        extractContentType(
            inspected.details
        );

    const signerCount =
        countMatches(
            inspected.details,
            /signerInfos:/g
        );

    const recipientCount =
        countMatches(
            inspected.details,
            /recipientInfos:/g
        );

    const certificateCount = inspected.certificateCount;

    const status =
        contentType === "encryptedData" ||
        contentType === "envelopedData"
            ? "Encrypted"
            : contentType === "signedData"
                ? "Signed"
                : "Parsed";

    const values: Record<string, string> = {
        Type: cmsDisplayType(filePath),
        Encoding: encoding,
        Status: status,
        "Content type":
            formatContentType(
                contentType
            ),
        "File path": filePath,
        "File size":
            `${bytes.length} bytes`,
        "SHA-256": hash,
        Summary: buildSummary(
            filePath,
            contentType,
            certificateCount
        )
    };

    if (certificateCount > 0) {
        values["Certificate count"] =
            String(certificateCount);
    }

    if (signerCount > 0) {
        values["Signer info count"] =
            String(signerCount);
    }

    if (recipientCount > 0) {
        values["Recipient info count"] =
            String(recipientCount);
    }

    if (inspected.subjects.length > 0) {
        values.Subjects =
            inspected.subjects.join(
                "\n"
            );
    }

    if (inspected.issuers.length > 0) {
        values.Issuers =
            inspected.issuers.join(
                "\n"
            );
    }

    values.Details =
        inspected.details;

    return {
        values
    };
}

interface CmsInspectionResult {
    details: string;
    subjects: string[];
    issuers: string[];
    certificateCount: number;
}

function inspectWithOpenSsl(
    bytes: Uint8Array,
    encoding: "PEM" | "DER" | "SMIME",
    filePath: string
): CmsInspectionResult | undefined {
    const temporaryDirectory =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "sato-cms-"
            )
        );

    const inputPath = path.join(
        temporaryDirectory,
        path.basename(filePath)
    );

    const certificatesPath = path.join(
        temporaryDirectory,
        "certificates.pem"
    );

    try {
        fs.writeFileSync(
            inputPath,
            Buffer.from(bytes)
        );

        const result = spawnSync(
            "openssl",
            [
                "cms",
                "-cmsout",
                "-print",
                "-inform",
                encoding,
                "-in",
                inputPath,
                "-certsout",
                certificatesPath
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

        const details = result.stdout.trim();

        const certificates =
            readCertificates(
                certificatesPath
            );

        return {
            details,
            subjects: certificates.map(
                (certificate) =>
                    certificate.subject
            ),
            issuers: certificates.map(
                (certificate) =>
                    certificate.issuer
            ),
            certificateCount:
                certificates.length
        };
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
            // Ignore cleanup errors.
        }
    }
}

interface CmsCertificateInfo {
    subject: string;
    issuer: string;
}

function readCertificates(
    certificatesPath: string
): CmsCertificateInfo[] {
    if (!fs.existsSync(certificatesPath)) {
        return [];
    }

    let content: string;

    try {
        content = fs.readFileSync(
            certificatesPath,
            "utf8"
        );
    } catch {
        return [];
    }

    const pemCertificates =
        content.match(
            /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g
        ) || [];

    const certificates:
        CmsCertificateInfo[] = [];

    for (const pem of pemCertificates) {
        try {
            const certificate =
                new crypto.X509Certificate(
                    pem
                );

            certificates.push({
                subject:
                    certificate.subject,
                issuer:
                    certificate.issuer
            });
        } catch {
            // Ignore invalid certificates.
        }
    }

    return certificates;
}

function detectEncoding(
    bytes: Uint8Array
): "PEM" | "DER" | "SMIME" {
    const text = Buffer.from(bytes)
        .subarray(
            0,
            Math.min(
                bytes.length,
                2048
            )
        )
        .toString("utf8")
        .trimStart();

    if (
        text.includes(
            "-----BEGIN PKCS7-----"
        ) ||
        text.includes(
            "-----BEGIN CMS-----"
        )
    ) {
        return "PEM";
    }

    if (
        /^content-type:/im.test(text) ||
        /^mime-version:/im.test(text)
    ) {
        return "SMIME";
    }

    return "DER";
}

function extractContentType(
    details: string
): string {
    const oidMatch = details.match(
        /contentType:\s*([^\s(]+)/i
    );

    if (oidMatch?.[1]) {
        return normalizeContentType(
            oidMatch[1]
        );
    }

    const typeMatch = details.match(
        /contentType:\s+[^(]*\(([^)]+)\)/i
    );

    if (typeMatch?.[1]) {
        return normalizeContentType(
            typeMatch[1]
        );
    }

    if (
        /\bsignedData\b/i.test(details)
    ) {
        return "signedData";
    }

    if (
        /\benvelopedData\b/i.test(details)
    ) {
        return "envelopedData";
    }

    if (
        /\bencryptedData\b/i.test(details)
    ) {
        return "encryptedData";
    }

    return "";
}

function normalizeContentType(
    value: string
): string {
    const normalized =
        value.trim();

    const lower =
        normalized.toLowerCase();

    if (
        lower.includes(
            "signeddata"
        ) ||
        normalized ===
            "1.2.840.113549.1.7.2"
    ) {
        return "signedData";
    }

    if (
        lower.includes(
            "envelopeddata"
        ) ||
        normalized ===
            "1.2.840.113549.1.7.3"
    ) {
        return "envelopedData";
    }

    if (
        lower.includes(
            "encrypteddata"
        ) ||
        normalized ===
            "1.2.840.113549.1.7.6"
    ) {
        return "encryptedData";
    }

    if (
        lower.includes("data") ||
        normalized ===
            "1.2.840.113549.1.7.1"
    ) {
        return "data";
    }

    return normalized;
}

function formatContentType(
    contentType: string
): string {
    switch (contentType) {
        case "signedData":
            return "Signed Data";

        case "envelopedData":
            return "Enveloped Data";

        case "encryptedData":
            return "Encrypted Data";

        case "data":
            return "Data";

        default:
            return (
                contentType ||
                "Unknown"
            );
    }
}

function extractDistinguishedNames(
    details: string,
    field: "subject" | "issuer"
): string[] {
    const pattern = new RegExp(
        `${field}:\\s*([^\\r\\n]+)`,
        "gi"
    );

    const values: string[] = [];

    for (
        const match of details.matchAll(
            pattern
        )
    ) {
        const value =
            match[1]?.trim();

        if (
            value &&
            !values.includes(value)
        ) {
            values.push(value);
        }
    }

    return values;
}

function countMatches(
    value: string,
    pattern: RegExp
): number {
    return (
        value.match(pattern)?.length ||
        0
    );
}

function cmsDisplayType(
    filePath: string
): string {
    return filePath
        .toLowerCase()
        .endsWith(".p7s")
        ? "PKCS#7 Digital Signature"
        : "CMS/S/MIME Message";
}

function buildSummary(
    filePath: string,
    contentType: string,
    certificateCount: number
): string {
    const type =
        cmsDisplayType(filePath);

    const formattedContentType =
        formatContentType(
            contentType
        );

    const certificateText =
        certificateCount > 0
            ? ` Contains ${certificateCount} certificate(s).`
            : "";

    return (
        `${type}. Content type: ${formattedContentType}.` +
        certificateText
    );
}
