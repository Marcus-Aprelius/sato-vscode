import type { CryptoInspection } from "../types";

import {
    collectOpenSslValues,
    sanitizeOpenSslDetails,
    sha256Hex,
    uniqueValues
} from "../format";

import {
    runWithTempFile
} from "../cli";

export function inspectPkcs12(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    return {
        values: {
            Type: "PKCS#12 Container",
            Status: "Locked",
            Summary:
                "PKCS#12/PFX container detected. Password required to inspect certificates and private keys.",
            "File path": filePath,
            "Container size": `${bytes.length} bytes`,
            "SHA-256": sha256Hex(bytes)
        }
    };
}

export function inspectPkcs12Unlocked(
    bytes: Uint8Array,
    filePath: string,
    password: string
): CryptoInspection {
    const output = runWithTempFile(
        bytes,
        "container.p12",
        "openssl",
        (tmpFile) => [
            "pkcs12",
            "-in",
            tmpFile,
            "-info",
            "-nokeys",
            "-passin",
            `pass:${password}`
        ]
    );

    if (!output.ok) {
        return {
            values: {
                Type: "PKCS#12 Container",
                Status: "Unlock failed",
                Summary: "Wrong password or unsupported PKCS#12/PFX container.",
                "File path": filePath,
                "Container size": `${bytes.length} bytes`,
                "SHA-256": sha256Hex(bytes)
            }
        };
    }

    const details = sanitizeOpenSslDetails(output.text);

    const friendlyNames = uniqueValues(
        collectOpenSslValues(
            output.text,
            /friendlyName:\s*([^\r\n]+)/gi
        )
    );

    const subjects = uniqueValues(
        collectOpenSslValues(
            output.text,
            /subject=([^\r\n]+)/gi
        )
    );

    const issuers = uniqueValues(
        collectOpenSslValues(
            output.text,
            /issuer=([^\r\n]+)/gi
        )
    );

    const certificateCount =
        (output.text.match(/-----BEGIN CERTIFICATE-----/g) || []).length;

    const privateKeyBagCount =
        (output.text.match(/Shrouded Keybag|Key bag/gi) || []).length;

    return {
        values: {
            Type: "PKCS#12 Container",
            Status: "Unlocked",
            "Certificate count": String(certificateCount),
            "Private key bags": String(privateKeyBagCount),
            "Friendly names": friendlyNames.join(", "),
            Subjects: subjects.join("\n"),
            Issuers: issuers.join("\n"),
            "File path": filePath,
            "Container size": `${bytes.length} bytes`,
            "SHA-256": sha256Hex(bytes),
            Details: details,
            Summary:
                certificateCount > 0
                    ? `PKCS#12 container unlocked. Certificates: ${certificateCount}.`
                    : "PKCS#12 container unlocked."
        }
    };
}
