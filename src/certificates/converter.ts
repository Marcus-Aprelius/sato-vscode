

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { createTemporaryDirectory, removeTemporaryDirectory } from "./cli/tempDirectory";

export type CertificateOutputFormat = | "PEM" | "DER";
export type OpenSshPublicKeyOutputFormat = | "RFC4716" | "PKCS8" | "PEM";
export type CryptoOutputFormat = | CertificateOutputFormat | OpenSshPublicKeyOutputFormat;

export interface CryptoConversionResult {
    bytes: Uint8Array;
    extension: | ".pem" | ".der" | ".pub";
}

export interface AvailableOutputFormat {
    value: CryptoOutputFormat;
    label: string;
    extension: string;
}

export function convertCertificate(
    bytes: Uint8Array,
    outputFormat: CertificateOutputFormat
): CryptoConversionResult {
    const certificate = new crypto.X509Certificate(Buffer.from(bytes));

    if (outputFormat === "DER") {
        return {
            bytes: new Uint8Array(certificate.raw),
            extension: ".der"
        };
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

        const result = spawnSync(
            "ssh-keygen",
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
