import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { createTemporaryDirectory, removeTemporaryDirectory } from "./cli/tempDirectory";

export type RsaKeyOutputFormat = | "RSA_PKCS1_PEM" | "RSA_PKCS1_DER" | "RSA_PKCS8_PEM" | "RSA_PKCS8_DER"
                                 | "RSA_SPKI_PEM" | "RSA_SPKI_DER" | "RSA_PUBLIC_PKCS1_PEM" | "RSA_PUBLIC_PKCS1_DER";

export type CertificateOutputFormat = | "PEM" | "DER";
export type OpenSshPublicKeyOutputFormat = | "RFC4716" | "PKCS8" | "PEM";
export type EcKeyOutputFormat = | "EC_SEC1_PEM" | "EC_SEC1_DER" | "EC_PKCS8_PEM" | "EC_PKCS8_DER" | "EC_SPKI_PEM" | "EC_SPKI_DER";
export type SpcOutputFormat = | "SPC_CMS_PEM" | "SPC_CERTIFICATES_PEM" | "SPC_CERTIFICATES_DER" | "SPC_CERTIFICATE_CHAIN_P7B";
export type CryptoOutputFormat = | CertificateOutputFormat | OpenSshPublicKeyOutputFormat | RsaKeyOutputFormat | EcKeyOutputFormat | SpcOutputFormat;

export interface CryptoConversionResult {
    bytes: Uint8Array;
    extension: | ".pem" | ".der" | ".pub" | ".rsa" | ".ec" | ".p7b";
}

export interface SpcConversionFile {
    bytes: Uint8Array;
    fileNameSuffix: string;
    extension: | ".pem" | ".der" | ".p7b";
}

export interface SpcConversionResult {
    files: SpcConversionFile[];
}

export interface AvailableOutputFormat {
    value: CryptoOutputFormat;
    label: string;
    extension: string;
    operation?: "convert" | "extract";
}

export function convertCertificate(
    bytes: Uint8Array,
    outputFormat: CertificateOutputFormat
): CryptoConversionResult {
    const certificate = new crypto.X509Certificate(Buffer.from(bytes));

    if (outputFormat === "DER") {
        return {bytes: new Uint8Array(certificate.raw), extension: ".der"};
    }

    const base64 = certificate.raw.toString("base64");
    const lines = base64.match(/.{1,64}/g) || [];
    const pem = ["-----BEGIN CERTIFICATE-----", ...lines, "-----END CERTIFICATE-----", ""].join("\n");

    return {
        bytes: new Uint8Array(Buffer.from(pem, "utf8")),
        extension: ".pem"
    };
}

export function certificateOutputFormat(
    currentEncoding: string
): CertificateOutputFormat {
    return currentEncoding.trim().toUpperCase() === "DER" ? "PEM" : "DER";
}

export function openSshPublicKeyOutputFormats(
    keyType: string
): AvailableOutputFormat[] {
    const normalizedKeyType = keyType.trim().toLowerCase();

    const formats: AvailableOutputFormat[] = [
        {value: "RFC4716", label: "RFC 4716 / SSH2", extension: ".pub"},
        {value: "PKCS8", label: "PKCS#8 PEM", extension: ".pem"}
    ];

    if (normalizedKeyType === "ssh-rsa") {
        formats.push({value: "PEM", label: "PEM / PKCS#1", extension: ".pem"});
    }

    return formats;
}

export function convertOpenSshPublicKey(
    bytes: Uint8Array,
    outputFormat: OpenSshPublicKeyOutputFormat
): CryptoConversionResult {
    const temporaryDirectory = createTemporaryDirectory("sato-pub-convert-");
    const inputPath = path.join(temporaryDirectory, "public-key.pub");

    try {
        fs.writeFileSync(inputPath, Buffer.from(bytes));

        const result = spawnSync("ssh-keygen",
            ["-e", "-m", outputFormat, "-f", inputPath],
            {encoding: "utf8", maxBuffer: 4 * 1024 * 1024, windowsHide: true, timeout: 30000}
        );

        if (result.error || result.status !== 0 || !result.stdout.trim()) {
            const message = result.stderr?.trim() || result.error?.message || "ssh-keygen conversion failed.";

            throw new Error(message);
        }

        return {
            bytes: new Uint8Array(Buffer.from(result.stdout, "utf8")),
            extension: outputFormat === "RFC4716" ? ".pub" : ".pem"
        };

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}

export function rsaKeyOutputFormats(
    keyKind: "private" | "public"
): AvailableOutputFormat[] {
    const publicFormats: AvailableOutputFormat[] = [
        {value: "RSA_SPKI_PEM", label: "Public Key: SPKI PEM", extension: ".rsa", operation: keyKind === "private" ? "extract" : "convert"},
        {value: "RSA_SPKI_DER", label: "Public Key: SPKI DER", extension: ".rsa", operation:  keyKind === "private" ? "extract" : "convert"},
        {value: "RSA_PUBLIC_PKCS1_PEM", label: "Public Key: PKCS#1 PEM", extension: ".rsa", operation: keyKind === "private" ? "extract" : "convert"},
        {value: "RSA_PUBLIC_PKCS1_DER", label: "Public Key: PKCS#1 DER", extension: ".rsa", operation: keyKind === "private" ? "extract" : "convert"}
    ];

    if (keyKind === "public") {
        return publicFormats;
    }

    return [
        {value: "RSA_PKCS1_PEM", label: "Private Key: PKCS#1 PEM", extension: ".rsa", operation: "convert"},
        {value: "RSA_PKCS1_DER", label: "Private Key: PKCS#1 DER", extension: ".rsa", operation: "convert"},
        {value: "RSA_PKCS8_PEM", label: "Private Key: PKCS#8 PEM", extension: ".rsa", operation: "convert"},
        {value: "RSA_PKCS8_DER", label: "Private Key: PKCS#8 DER", extension: ".rsa", operation: "convert"},
        ...publicFormats
    ];
}

export function convertRsaKey(
    bytes: Uint8Array,
    outputFormat: RsaKeyOutputFormat
): CryptoConversionResult {
    const privateKey = readRsaPrivateKey(bytes);

    const requiresPrivateKey =
        outputFormat === "RSA_PKCS1_PEM" || outputFormat === "RSA_PKCS1_DER" ||
        outputFormat === "RSA_PKCS8_PEM" || outputFormat === "RSA_PKCS8_DER";

    if (requiresPrivateKey && !privateKey) {
        throw new Error("A public RSA key cannot be converted to a private key.");
    }

    const publicKey = privateKey ? crypto.createPublicKey(privateKey) : readRsaPublicKey(bytes);

    if (!publicKey) {
        throw new Error("The file is not a supported RSA key.");
    }

    let exported: string | Buffer;

    switch (outputFormat) {
        case "RSA_PKCS1_PEM": exported = privateKey!.export({type: "pkcs1", format: "pem"});
            break;

        case "RSA_PKCS1_DER":
            exported = privateKey!.export({type: "pkcs1", format: "der"});
            break;

        case "RSA_PKCS8_PEM":
            exported = privateKey!.export({type: "pkcs8", format: "pem"});
            break;

        case "RSA_PKCS8_DER":
            exported = privateKey!.export({type: "pkcs8", format: "der"});
            break;

        case "RSA_SPKI_PEM":
            exported = publicKey.export({type: "spki", format: "pem"});
            break;

        case "RSA_SPKI_DER":
            exported = publicKey.export({type: "spki", format: "der"});
            break;

        case "RSA_PUBLIC_PKCS1_PEM":
            exported = publicKey.export({type: "pkcs1", format: "pem"});
            break;

        case "RSA_PUBLIC_PKCS1_DER":
            exported = publicKey.export({type: "pkcs1", format: "der"});
            break;

        default:
            throw new Error("Unsupported RSA output format.");
    }

    return {
        bytes: new Uint8Array(typeof exported === "string" ? Buffer.from(exported, "utf8") : exported),
        extension: ".rsa"
    };
}

export function isRsaKeyOutputFormat(
    value: CryptoOutputFormat
): value is RsaKeyOutputFormat {
    return (
        value === "RSA_PKCS1_PEM" || value === "RSA_PKCS1_DER" || value === "RSA_PKCS8_PEM" || value === "RSA_PKCS8_DER" ||
        value === "RSA_SPKI_PEM" || value === "RSA_SPKI_DER" || value === "RSA_PUBLIC_PKCS1_PEM" || value === "RSA_PUBLIC_PKCS1_DER"
    );
}

export function isEcKeyOutputFormat(
    value: CryptoOutputFormat
): value is EcKeyOutputFormat {
    return (
        value === "EC_SEC1_PEM" || value === "EC_SEC1_DER" || value === "EC_PKCS8_PEM" ||
        value === "EC_PKCS8_DER" || value === "EC_SPKI_PEM" ||value === "EC_SPKI_DER"
    );
}

export function isSpcOutputFormat(
    value: CryptoOutputFormat
): value is SpcOutputFormat {
    return (
        value === "SPC_CMS_PEM" ||
        value === "SPC_CERTIFICATES_PEM" ||
        value === "SPC_CERTIFICATES_DER" ||
        value === "SPC_CERTIFICATE_CHAIN_P7B"
    );
}

export function spcOutputFormats(): AvailableOutputFormat[] {
    return [
        {value: "SPC_CMS_PEM", label: "CMS/PKCS#7 PEM", extension: ".pem", operation: "convert"},
        {value: "SPC_CERTIFICATES_PEM", label: "Certificates as PEM", extension: ".pem", operation: "extract"},
        {value: "SPC_CERTIFICATES_DER", label: "Certificates as DER", extension: ".der", operation: "extract"},
        {value: "SPC_CERTIFICATE_CHAIN_P7B", label: "Certificate chain as P7B", extension: ".p7b", operation: "extract"}
    ];
}

function readRsaPrivateKey(
    bytes: Uint8Array
): crypto.KeyObject | undefined {
    const buffer = Buffer.from(bytes);
    const text = buffer.toString("utf8");

    if (text.includes("-----BEGIN")) {
        try {
            const key = crypto.createPrivateKey(text);

            return key.asymmetricKeyType === "rsa" ? key : undefined;

        } catch {
            return undefined;
        }
    }

    for (const type of ["pkcs1", "pkcs8"] as const) {
        try {
            const key = crypto.createPrivateKey({key: buffer, format: "der", type});

            if (key.asymmetricKeyType === "rsa") {
                return key;
            }

        } catch {
            // Try the next RSA format.
        }
    }

    return undefined;
}

function readRsaPublicKey(
    bytes: Uint8Array
): crypto.KeyObject | undefined {
    const buffer = Buffer.from(bytes);
    const text = buffer.toString("utf8");

    if (text.includes("-----BEGIN")) {
        try {
            const key = crypto.createPublicKey(text);

            return key.asymmetricKeyType === "rsa" ? key : undefined;

        } catch {
            return undefined;
        }
    }

    for (const type of ["spki", "pkcs1"] as const) {
        try {
            const key = crypto.createPublicKey({key: buffer, format: "der", type});

            if (key.asymmetricKeyType === "rsa") {
                return key;
            }

        } catch {
            // Try the next RSA format.
        }
    }

    return undefined;
}

export function ecKeyOutputFormats(
    keyKind: "private" | "public"
): AvailableOutputFormat[] {
    const publicOperation = keyKind === "private" ? "extract" : "convert";

    const publicFormats: AvailableOutputFormat[] = [
        {value: "EC_SPKI_PEM", label: "Public Key: SPKI PEM", extension: ".ec", operation: publicOperation},
        {value: "EC_SPKI_DER", label: "Public Key: SPKI DER", extension: ".ec", operation: publicOperation}
    ];

    if (keyKind === "public") {
        return publicFormats;
    }

    return [
        { value: "EC_SEC1_PEM", label: "Private Key: SEC1 PEM", extension: ".ec", operation: "convert"},
        {value: "EC_SEC1_DER", label: "Private Key: SEC1 DER", extension: ".ec", operation: "convert"},
        {value: "EC_PKCS8_PEM",label: "Private Key: PKCS#8 PEM", extension: ".ec", operation: "convert"},
        {value: "EC_PKCS8_DER", label: "Private Key: PKCS#8 DER", extension: ".ec", operation: "convert"},
        ...publicFormats
    ];
}

export function convertEcKey(
    bytes: Uint8Array,
    outputFormat: EcKeyOutputFormat
): CryptoConversionResult {
    const privateKey = readEcPrivateKey(bytes);

    const requiresPrivateKey = outputFormat === "EC_SEC1_PEM" || outputFormat === "EC_SEC1_DER" ||
                               outputFormat === "EC_PKCS8_PEM" || outputFormat === "EC_PKCS8_DER";

    if (requiresPrivateKey && !privateKey) {
        throw new Error("A public EC key cannot be converted to a private key.");
    }

    const publicKey = privateKey ? crypto.createPublicKey(privateKey) : readEcPublicKey(bytes);

    if (!publicKey) {
        throw new Error("The file is not a supported EC key.");
    }

    let exported: string | Buffer;

    switch (outputFormat) {
        case "EC_SEC1_PEM":
            exported = privateKey!.export({type: "sec1", format: "pem"});
            break;

        case "EC_SEC1_DER":
            exported = privateKey!.export({type: "sec1", format: "der"});
            break;

        case "EC_PKCS8_PEM":
            exported = privateKey!.export({type: "pkcs8", format: "pem"});
            break;

        case "EC_PKCS8_DER":
            exported = privateKey!.export({type: "pkcs8", format: "der"});
            break;

        case "EC_SPKI_PEM":
            exported = publicKey.export({type: "spki", format: "pem"});
            break;

        case "EC_SPKI_DER":
            exported = publicKey.export({type: "spki", format: "der"});
            break;

        default:
            throw new Error("Unsupported EC output format.");
    }

    return {
        bytes: new Uint8Array(typeof exported === "string" ? Buffer.from(exported, "utf8") : exported),
        extension: ".ec"
    };
}

function readEcPrivateKey(
    bytes: Uint8Array
): crypto.KeyObject | undefined {
    const buffer = Buffer.from(bytes);
    const text = buffer.toString("utf8");

    if (text.includes("-----BEGIN")) {
        try {
            const key = crypto.createPrivateKey(text);

            return key.asymmetricKeyType === "ec" ? key : undefined;

        } catch {
            return undefined;
        }
    }

    for (const type of ["pkcs8", "sec1"] as const) {
        try {
            const key = crypto.createPrivateKey({key: buffer, format: "der", type});

            if (key.asymmetricKeyType === "ec") {
                return key;
            }
        } catch {
            // Try the next EC format.
        }
    }

    return undefined;
}

function readEcPublicKey(
    bytes: Uint8Array
): crypto.KeyObject | undefined {
    const buffer = Buffer.from(bytes);
    const text = buffer.toString("utf8");

    if (text.includes("-----BEGIN")) {
        try {
            const key = crypto.createPublicKey(text);

            return key.asymmetricKeyType === "ec" ? key : undefined;

        } catch {
            return undefined;
        }
    }

    try {
        const key = crypto.createPublicKey({key: buffer, format: "der", type: "spki"});

        return key.asymmetricKeyType === "ec" ? key : undefined;

    } catch {
        return undefined;
    }
}

export function convertSpc(
    bytes: Uint8Array,
    outputFormat: SpcOutputFormat
): SpcConversionResult {
    const temporaryDirectory = createTemporaryDirectory("sato-spc-convert-");
    const inputPath = path.join(temporaryDirectory, "container.spc");
    const certificatesPath = path.join(temporaryDirectory, "certificates.pem");

    try {
        fs.writeFileSync(inputPath, Buffer.from(bytes));

        if (outputFormat === "SPC_CMS_PEM") {
            const result = spawnSync("openssl",
                ["cms", "-cmsout", "-inform", "DER", "-outform", "PEM", "-in", inputPath],
                {encoding: "utf8", maxBuffer: 16 * 1024 * 1024, windowsHide: true, timeout: 30000}
            );

            if (result.error || result.status !== 0 || !result.stdout.trim()) {
                throw new Error(result.stderr?.trim() || result.error?.message || "Failed to convert SPC container to CMS PEM.");
            }

            return {
                files: [{bytes: new Uint8Array(Buffer.from(result.stdout, "utf8")), fileNameSuffix: "-cms", extension: ".pem"}]
            };
        }

        extractSpcCertificates(inputPath, certificatesPath);
        const pemCertificates = readPemCertificates(certificatesPath);

        if (pemCertificates.length === 0) {
            throw new Error("No certificates were found in the SPC container.");
        }

        if (outputFormat === "SPC_CERTIFICATES_PEM") {
            return {
                files:
                    pemCertificates.map(
                        (certificate, index) => ({
                            bytes: new Uint8Array(Buffer.from(certificate + "\n", "utf8")),
                            fileNameSuffix: `-certificate-${index + 1}`,
                            extension: ".pem"
                        })
                    )
            };
        }

        if (outputFormat === "SPC_CERTIFICATES_DER") {
            return {
                files:
                    pemCertificates.map(
                        (certificate, index) => {const parsed = new crypto.X509Certificate(certificate);

                            return {bytes: new Uint8Array(parsed.raw), fileNameSuffix: `-certificate-${index + 1}`, extension: ".der" as const};
                        }
                    )
            };
        }

        if (outputFormat === "SPC_CERTIFICATE_CHAIN_P7B") {
            const outputPath = path.join(temporaryDirectory, "certificate-chain.p7b");

            const result = spawnSync("openssl",
                ["crl2pkcs7", "-nocrl", "-certfile", certificatesPath, "-outform", "DER", "-out", outputPath],
                {encoding: "utf8", maxBuffer: 16 * 1024 * 1024, windowsHide: true, timeout: 30000}
            );

            if (result.error || result.status !== 0 || !fs.existsSync(outputPath)) {
                throw new Error(result.stderr?.trim() || result.error?.message || "Failed to create a PKCS#7 certificate chain.");
            }

            return {files: [{bytes:new Uint8Array(fs.readFileSync(outputPath)), fileNameSuffix: "-certificate-chain", extension: ".p7b"}]};
        }

        throw new Error("Unsupported SPC output format.");

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}

function extractSpcCertificates(
    inputPath: string,
    certificatesPath: string
): void {
    const result = spawnSync("openssl",
        ["cms", "-cmsout", "-inform", "DER", "-in", inputPath, "-certsout", certificatesPath, "-noout"],
        {encoding: "utf8", maxBuffer: 16 * 1024 * 1024, windowsHide: true, timeout: 30000}
    );

    if (result.error || result.status !== 0 || !fs.existsSync(certificatesPath)) {
        throw new Error(result.stderr?.trim() || result.error?.message || "Failed to extract certificates from the SPC container.");
    }
}

function readPemCertificates(
    certificatesPath: string
): string[] {
    const content = fs.readFileSync(certificatesPath, "utf8");

    return (content.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || []);
}
