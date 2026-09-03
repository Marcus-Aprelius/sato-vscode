import * as crypto from "crypto";
import { runWithTempFile } from "../cli";
import { containerMetadata } from "../fileMetadata";

import type { CryptoInspection } from "../types";

import {
    collectOpenSslValues,
    sanitizeOpenSslDetails,
    uniqueValues
} from "../format";

export function inspectPkcs12(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    return {
        values: {
            Type: "PKCS#12 Container",
            Status: "Locked",
            Summary: "PKCS#12/PFX container detected. Password required to inspect certificates and private keys.",
            ...containerMetadata(bytes, filePath)
        }
    };
}

export function inspectPkcs12Unlocked(
    bytes: Uint8Array,
    filePath: string,
    password: string
): CryptoInspection {
    const output = runWithTempFile(bytes, "container.p12","openssl",
        (tmpFile) => ["pkcs12", "-in", tmpFile, "-info", "-nokeys", "-passin", `pass:${password}`]
    );

    if (!output.ok) {
        return {
            values: {
                Type: "PKCS#12 Container",
                Status: "Unlock failed",
                Summary: "Wrong password or unsupported PKCS#12/PFX container.",
                ...containerMetadata(bytes, filePath)
            }
        };
    }

    const details = sanitizeOpenSslDetails(output.text);
    const privateKeyPem = extractPrivateKey(bytes, password);
    const friendlyNames = uniqueValues(collectOpenSslValues(output.text, /friendlyName:\s*([^\r\n]+)/gi));
    const subjects = uniqueValues(collectOpenSslValues(output.text, /subject=([^\r\n]+)/gi));
    const issuers = uniqueValues(collectOpenSslValues(output.text, /issuer=([^\r\n]+)/gi));
    const certificateCount = (output.text.match(/-----BEGIN CERTIFICATE-----/g) || []).length;
    const privateKeyBagCount = (output.text.match(/Shrouded Keybag|Key bag/gi) || []).length;
    const extractedPrivateKeyCount = privateKeyPem ? 1 : 0;

    return {
        values: {
            Type: "PKCS#12 Container",
            Status: "Unlocked",
            "Certificate count": String(certificateCount),
            "Private key bags": String(privateKeyBagCount),
            "Extracted private keys": String(extractedPrivateKeyCount),
            "Friendly names": friendlyNames.join(", "),
            Subjects: subjects.join("\n"),
            Issuers: issuers.join("\n"),
            ...containerMetadata(bytes, filePath),
            Details: details,
            Summary:
                certificateCount > 0
                    ? `PKCS#12 container unlocked. Certificates: ${certificateCount}.`
                    : "PKCS#12 container unlocked."
        },
        privateKeyPem
    };
}

function extractPrivateKey(
    bytes: Uint8Array,
    password: string
): string | undefined {
    const output = runWithTempFile(bytes, "container.p12", "openssl", (tmpFile) =>
        ["pkcs12", "-in", tmpFile, "-nocerts", "-nodes", "-passin", `pass:${password}`]
    );

    if (!output.ok) {
        return undefined;
    }

    const match = output.text.match(
        /-----BEGIN (?:PRIVATE KEY|RSA PRIVATE KEY|EC PRIVATE KEY)-----[\s\S]*?-----END (?:PRIVATE KEY|RSA PRIVATE KEY|EC PRIVATE KEY)-----/
    );

    if (!match) {
        return undefined;
    }

    try {
        const privateKey = crypto.createPrivateKey(match[0]);
        const exported = privateKey.export({type: "pkcs8", format: "pem"});

        return typeof exported === "string" ? exported : exported.toString("utf8");

    } catch {
        return undefined;
    }
}
