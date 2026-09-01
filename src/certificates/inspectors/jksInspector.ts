import { runWithTempFile } from "../cli";
import type { CryptoInspection } from "../types";

import {
    collectOpenSslValues,
    extractOpenSslValue,
    normalizeAlgorithm,
    normalizeSignatureAlgorithm,
    uniqueValues
} from "../format";
import {containerMetadata} from "../fileMetadata";

export function inspectJks(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    return {
        values: {
            Type: "Java KeyStore",
            Status: "Locked",
            Summary: "Java KeyStore detected. Password required to inspect aliases and certificates.",
            ...containerMetadata(bytes, filePath)
        }
    };
}

export function inspectJksUnlocked(
    bytes: Uint8Array,
    filePath: string,
    password: string
): CryptoInspection {
    const output = runWithTempFile(bytes, "keystore.jks", "keytool",
        (tmpFile) => ["-list", "-v", "-storetype", keyStoreType(filePath), "-keystore", tmpFile, "-storepass", password]
    );

    if (!output.ok) {
        return {
            values: {
                Type: keyStoreType(filePath) === "JCEKS" ? "Java Cryptography Extension KeyStore" : "Java KeyStore",
                Status: "Unlock failed",
                Summary: "Wrong password or unsupported Java KeyStore.",
                ...containerMetadata(bytes, filePath)
            }
        };
    }

    const text = output.text;
    const aliases = uniqueValues(collectOpenSslValues(text, /Alias name:\s*([^\r\n]+)/gi));
    const owners = uniqueValues(collectOpenSslValues(text, /Owner:\s*([^\r\n]+)/gi));
    const issuers = uniqueValues(collectOpenSslValues(text, /Issuer:\s*([^\r\n]+)/gi));
    const validFrom = uniqueValues(collectOpenSslValues(text, /Valid from:\s*([^\r\n]+)/gi));
    const sha1Fingerprints = uniqueValues(collectOpenSslValues(text, /SHA1:\s*([^\r\n]+)/gi));
    const sha256Fingerprints = uniqueValues(collectOpenSslValues(text, /SHA256:\s*([^\r\n]+)/gi));

    const signatureAlgorithms = uniqueValues(
        collectOpenSslValues(text, /Signature algorithm name:\s*([^\r\n]+)/gi).map(normalizeSignatureAlgorithm)
    );

    const publicKeyAlgorithms = uniqueValues(
        collectOpenSslValues(text, /Subject Public Key Algorithm:\s*([^\r\n]+)/gi).map(normalizeAlgorithm)
    );

    const certificateTypes = uniqueValues(collectOpenSslValues(text, /Certificate type:\s*([^\r\n]+)/gi));

    return {
        values: {
            Type: keyStoreType(filePath) === "JCEKS"
                ? "Java Cryptography Extension KeyStore"
                : "Java KeyStore",
            Status: "Unlocked",
            "Keystore type": extractOpenSslValue(text, /Keystore type:\s*([^\r\n]+)/i),
            Provider: extractOpenSslValue(text, /Keystore provider:\s*([^\r\n]+)/i),
            "Entry count": extractOpenSslValue(text, /Your keystore contains\s+([^\r\n]+)/i),
            Aliases: aliases.join("\n"),
            Owners: owners.join("\n"),
            Issuers: issuers.join("\n"),
            "Valid from": validFrom.join("\n"),
            "Certificate type": certificateTypes.join("\n"),
            "Public Key Algorithm": publicKeyAlgorithms.join("\n"),
            "Signature Algorithm": signatureAlgorithms.join("\n"),
            "Fingerprint SHA-1": sha1Fingerprints.join("\n"),
            "Fingerprint SHA-256": sha256Fingerprints.join("\n"),
            ...containerMetadata(bytes, filePath ),
            Details: text.trim(),
            Summary:
                aliases.length > 0
                    ? `Java KeyStore unlocked. Aliases: ${aliases.length}.`
                    : "Java KeyStore unlocked."
        }
    };
}

function keyStoreType(filePath: string): string {
    return filePath.toLowerCase().endsWith(".jceks") ? "JCEKS" : "JKS";
}
