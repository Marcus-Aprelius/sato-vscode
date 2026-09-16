import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

import { spawnSync } from "child_process";
import { inspectCms } from "./cmsInspector";
import { inspectCsr } from "./csrInspector";
import { fileMetadata } from "../fileMetadata";
import { inspectEcKey } from "./ecKeyInspector";
import { inspectPkcs7 } from "./pkcs7Inspector";
import { inspectRsaKey } from "./rsaKeyInspector";
import { inspectCertificate } from "./certificateInspector";
import { createTemporaryDirectory, removeTemporaryDirectory} from "../cli/tempDirectory";

import type { CryptoInspection } from "../types";

type DerKeyType = | "rsa" | "ec";
type DerOpenSslType = | "req" | "pkcs7" | "cms";

export function inspectDer(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const buffer = Buffer.from(bytes);

    if (isDerCertificate(buffer)) {
        return {values: inspectCertificate(bytes, bytes, filePath)};
    }

    const privateKeyType = detectDerPrivateKeyType(buffer);

    if (privateKeyType === "rsa") {
        return inspectRsaKey("", bytes, filePath);
    }

    if (privateKeyType === "ec") {
        return inspectEcKey("", bytes, filePath);
    }

    const publicKeyType = detectDerPublicKeyType(buffer);

    if (publicKeyType === "rsa") {
        return inspectRsaKey("", bytes, filePath);
    }

    if (publicKeyType === "ec") {
        return inspectEcKey("", bytes, filePath);
    }

    if (canInspectDerWithOpenSsl(bytes, "req")) {
        return {values: inspectCsr("", bytes, filePath)};
    }

    if (isDerCmsMessage(bytes)) {
        return inspectCms(bytes, filePath);
    }

    if (canInspectDerWithOpenSsl(bytes, "pkcs7")) {
        return inspectPkcs7(bytes, filePath);
    }

    return {
        values: {
            Type: "Unknown DER File",
            Encoding: "DER",
            Status: "Unsupported",
            Summary: "The DER file is not a recognized certificate, CSR, RSA/EC key, PKCS#7 container, or CMS message.",
            ...fileMetadata(bytes, filePath)
        }
    };
}

function isDerCertificate(
    buffer: Buffer
): boolean {
    try {
        new crypto.X509Certificate(buffer);

        return true;

    } catch {
        return false;
    }
}

function detectDerPrivateKeyType(
    buffer: Buffer
): DerKeyType | undefined {
    for (const type of ["pkcs8", "pkcs1", "sec1" ] as const) {
        try {
            const key = crypto.createPrivateKey({key: buffer, format: "der", type});

            if (key.asymmetricKeyType === "rsa") {
                return "rsa";
            }

            if (key.asymmetricKeyType === "ec") {
                return "ec";
            }

        } catch {
            // Try the next private-key format.
        }
    }

    return undefined;
}

function detectDerPublicKeyType(
    buffer: Buffer
): DerKeyType | undefined {
    for (const type of ["spki", "pkcs1" ] as const) {
        try {
            const key = crypto.createPublicKey({key: buffer, format: "der", type});

            if (key.asymmetricKeyType === "rsa") {
                return "rsa";
            }

            if (key.asymmetricKeyType === "ec") {
                return "ec";
            }

        } catch {
            // Try the next public-key format.
        }
    }

    return undefined;
}

function isDerCmsMessage(
    bytes: Uint8Array
): boolean {
    const output = inspectDerWithOpenSsl(bytes, "cms");

    if (!output) {
        return false;
    }

    if (/\b(?:envelopedData|encryptedData|authenticatedData|digestedData)\b/i.test(output)) {
        return true;
    }

    if (/\bsignedData\b/i.test(output)) {
        const signerInfos = output.match(/signerInfos:\s*([\s\S]*)$/i)?.[1] || "";

        return (signerInfos.trim() !== "" && !/^<EMPTY>/i.test(signerInfos.trim()));
    }

    return false;
}

function inspectDerWithOpenSsl(
    bytes: Uint8Array,
    type: DerOpenSslType
): string | undefined {
    const temporaryDirectory = createTemporaryDirectory("sato-der-detect-");

    const inputPath = path.join(temporaryDirectory, "input.der");

    try {
        fs.writeFileSync(inputPath, Buffer.from(bytes));

        const result = spawnSync(
            "openssl", opensslDetectionArguments(type, inputPath),
            {encoding: "utf8", maxBuffer: 16 * 1024 * 1024, windowsHide: true, timeout: 30000}
        );

        if (result.error || result.status !== 0) {
            return undefined;
        }

        return result.stdout || "";

    } catch {
        return undefined;

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}

function canInspectDerWithOpenSsl(
    bytes: Uint8Array,
    type: DerOpenSslType
): boolean {
    return (inspectDerWithOpenSsl(bytes, type) !== undefined);
}

function opensslDetectionArguments(
    type: DerOpenSslType,
    inputPath: string
): string[] {
    switch (type) {
        case "req":
            return ["req", "-inform", "DER", "-in", inputPath, "-noout"];

        case "pkcs7":
            return ["pkcs7", "-inform", "DER", "-in", inputPath, "-print_certs", "-noout"];

        case "cms":
            return ["cms", "-cmsout", "-print", "-inform", "DER", "-in", inputPath];

        default:
            return [];
    }
}
