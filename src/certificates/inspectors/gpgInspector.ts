import { uniqueValues } from "../format";
import { fileMetadata } from "../fileMetadata";
import { decryptGpgWithPrivateKey, runWithTempFile } from "../cli";

import type { CryptoInspection } from "../types";

export function inspectGpg(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const output = runWithTempFile(bytes, fileNameForGpg(filePath), "gpg",
        (tmpFile) => ["--batch", "--no-tty", "--list-packets", tmpFile ]
    );

    const details = output.text.trim();

    if (!details) {
        const encrypted = isOpenPgpEncryptedFile(filePath);

        return {
            values: {
                Type: encrypted ? "OpenPGP Encrypted Message" : "OpenPGP File",
                Status: "Inspection unavailable",
                Encrypted: encrypted ? "Yes" : "Unknown",
                Summary: encrypted
                    ? "OpenPGP encrypted message detected. GPG is required to inspect and decrypt this file."
                    : "OpenPGP file detected. GPG is required to inspect this file.",
                ...fileMetadata(bytes, filePath)
            }
        };
    }

    return buildGpgInspection(details, bytes, filePath);
}

export function inspectGpgUnlocked(
    bytes: Uint8Array,
    filePath: string,
    password: string,
    privateKeyBytes: Uint8Array
): CryptoInspection {
    const output = decryptGpgWithPrivateKey(bytes, privateKeyBytes, password);

    if (!output.ok) {
        const error = output.stderr || output.text;

        let message = "Failed to decrypt OpenPGP file.";

        if (/bad passphrase/i.test(error)) {
            message = "Wrong private key passphrase.";

        } else if (/no secret key/i.test(error)) {
            message = "The selected private key does not match this encrypted file.";

        } else if (/invalid armor|no valid openpgp data/i.test(error)) {
            message = "The selected file is not a valid OpenPGP private key.";
        }

        return {
            values: {
                Type: "OpenPGP Encrypted Message",
                Status: "Unlock failed",
                Encrypted: "Yes",
                Summary: message,
                ...fileMetadata(bytes, filePath)
            }
        };
    }

    return {
        values: {
            Type: "OpenPGP Encrypted Message",
            Status: "Unlocked",
            Encrypted: "Yes",
            "Decrypted content": output.stdout || "",
            ...fileMetadata(bytes, filePath),
            Summary: "OpenPGP message decrypted successfully."
        }
    };
}

function buildGpgInspection(
    details: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    
    const packetTypes = collectPacketTypes(details);
    const keyIds = collectValues(details, /\bkeyid\s+([0-9A-F]+)/gi);
    const userIds = collectValues(details, /:user ID packet:.*?"([^"]+)"/gi);
    const algorithms = collectValues(details, /\balgo\s+(\d+)/gi);
    const encrypted = isEncrypted(details);
    const signed = hasSignature(details);
    const type = detectGpgType(details);

    return {
        values: {
            Type: type,
            Status: encrypted ? "Encrypted" : "Readable",
            Encrypted: encrypted ? "Yes" : "No",
            Signed: signed ? "Yes" : "No",
            "Packet types": packetTypes.join(", "),
            "Key IDs": keyIds.join(", "),
            "User IDs": userIds.join("\n"),
            Algorithms: algorithms.join(", "),
            ...fileMetadata(bytes, filePath),
            Details: details,
            Summary: buildSummary(type, encrypted, signed, packetTypes.length)
        }
    };
}

function detectGpgType(details: string): string {
    if (/:secret key packet:/i.test(details) || /:secret sub key packet:/i.test(details)) {
        return "OpenPGP Private Key";
    }

    if (/:public key packet:/i.test(details) || /:public sub key packet:/i.test(details)) {
        return "OpenPGP Public Key";
    }

    if (/:symkey enc packet:/i.test(details) ||
        /:pubkey enc packet:/i.test(details) ||
        /:encrypted data packet:/i.test(details) ||
        /:aead encrypted packet:/i.test(details)) {
        return "OpenPGP Encrypted Message";
    }

    if (/:signature packet:/i.test(details)) {
        return "OpenPGP Signature";
    }

    if (/:literal data packet:/i.test(details)) {
        return "OpenPGP Message";
    }

    return "OpenPGP File";
}

function isEncrypted(details: string): boolean {
    return (
        /:symkey enc packet:/i.test(details) ||
        /:pubkey enc packet:/i.test(details) ||
        /:encrypted data packet:/i.test(details) ||
        /:aead encrypted packet:/i.test(details)
    );
}

function hasSignature(details: string): boolean {
    return /:signature packet:/i.test(details);
}

function collectPacketTypes(details: string): string[] {
    const values: string[] = [];
    const pattern = /^:([^:\r\n]+ packet):/gim;

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(details)) !== null) {
        const value = match[1]?.trim();

        if (value) {
            values.push(value);
        }
    }

    return uniqueValues(values);
}

function collectValues(
    details: string,
    pattern: RegExp
): string[] {
    const values: string[] = [];

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(details)) !== null) {
        const value = match[1]?.trim();

        if (value) {
            values.push(value);
        }
    }

    return uniqueValues(values);
}

function buildSummary(
    type: string,
    encrypted: boolean,
    signed: boolean,
    packetCount: number
): string {
    const flags: string[] = [];

    if (encrypted) {
        flags.push("encrypted");
    }

    if (signed) {
        flags.push("signed");
    }

    const suffix = flags.length ? ` (${flags.join(", ")})` : "";

    return `${type}${suffix}. Packet types: ${packetCount}.`;
}

function fileNameForGpg(filePath: string): string {
    const lowerPath = filePath.toLowerCase();

    if (lowerPath.endsWith(".asc")) {return "openpgp.asc";}
    if (lowerPath.endsWith(".sig")) {return "openpgp.sig";}
    if (lowerPath.endsWith(".pgp")) {return "openpgp.pgp";}
    return "openpgp.gpg";
}

function isOpenPgpEncryptedFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();

    return (lowerPath.endsWith(".gpg") || lowerPath.endsWith(".pgp"));
}
