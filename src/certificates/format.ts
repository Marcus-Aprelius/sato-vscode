import * as crypto from "crypto";

export function sha256Hex(data: Uint8Array): string {
    return crypto.createHash("sha256").update(data).digest("hex");
}

export function extractOpenSslValue(
    text: string,
    pattern: RegExp
): string {
    const match = text.match(pattern);

    return match?.[1]?.trim() || "";
}

export function collectOpenSslValues(
    text: string,
    pattern: RegExp
): string[] {
    const result: string[] = [];

    const flags = pattern.flags.includes("g")
        ? pattern.flags
        : pattern.flags + "g";

    const regex = new RegExp(pattern.source, flags);

    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        const value = match[1]?.trim();

        if (value) {
            result.push(value);
        }
    }

    return result;
}

export function uniqueValues(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
}

export function sanitizeOpenSslDetails(text: string): string {
    return text
        .replace(
            /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
            "[certificate PEM omitted]"
        )
        .replace(
            /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
            "[private key omitted]"
        )
        .trim();
}

export function normalizeAlgorithm(value: string): string {
    const normalized = value.trim();

    switch (normalized) {
        case "rsaEncryption":
        case "rsa":
            return "RSA";

        case "ec":
        case "id-ecPublicKey":
            return "EC";

        case "ed25519":
            return "Ed25519";

        default:
            return normalized;
    }
}

export function normalizeSignatureAlgorithm(value: string): string {
    const normalized = value.trim();

    switch (normalized) {
        case "sha256WithRSAEncryption":
            return "SHA-256 with RSA";

        case "sha384WithRSAEncryption":
            return "SHA-384 with RSA";

        case "sha512WithRSAEncryption":
            return "SHA-512 with RSA";

        case "ecdsa-with-SHA256":
            return "ECDSA with SHA-256";

        case "ecdsa-with-SHA384":
            return "ECDSA with SHA-384";

        case "ecdsa-with-SHA512":
            return "ECDSA with SHA-512";

        case "SHA256withRSA":
            return "SHA-256 with RSA";

        case "SHA384withRSA":
            return "SHA-384 with RSA";

        case "SHA512withRSA":
            return "SHA-512 with RSA";

        default:
            return normalized;
    }
}

export function isExpiredDate(value: string): boolean {
    if (!value) {
        return false;
    }

    const time = Date.parse(value);

    if (Number.isNaN(time)) {
        return false;
    }

    return time <= Date.now();
}

export function isExpiredCertificate(values: Record<string, string>): boolean {
    const validTo = values["Valid to"];

    return isExpiredDate(validTo);
}
