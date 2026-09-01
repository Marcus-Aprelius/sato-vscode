import * as crypto from "crypto";
import { sha256Hex } from "../format";
import { fileMetadata } from "../fileMetadata";
import { tryUnlockPpkWithPuttygen } from "../cli";
import { formatSshAlgorithm } from "../sshFormat";

import type { CryptoInspection } from "../types";

export function inspectPpk(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const parsed = parsePpk(text);

    if (!parsed) {
        return {
            values: {
                Type: "PuTTY Private Key",
                Status: "Unsupported",
                Summary: "The file does not contain a recognized PuTTY private key.",
                ...fileMetadata(bytes, filePath ),
            }
        };
    }

    const encrypted = parsed.encryption !== "none";
    const publicKey = decodeBase64Lines(parsed.publicLines);

    const values: Record<string, string> = {
        Type: "PuTTY Private Key",
        Version: parsed.version,
        Status: encrypted ? "Locked" : "Unencrypted",
        Algorithm: formatSshAlgorithm(parsed.algorithm),
        Encryption: encrypted ? parsed.encryption : "None",
        Comment: parsed.comment,
        "Public key SHA-256": publicKey.length > 0 ? sshFingerprint(publicKey) : "",
        "Public lines": String(parsed.publicLines.length),
        "Private lines": String(parsed.privateLines.length),
        ...fileMetadata(bytes, filePath ),
        Summary: encrypted ? buildEncryptedSummary(parsed) : buildUnencryptedSummary(parsed)
    };

    if (parsed.keyDerivation) {
        values["Key derivation"] = parsed.keyDerivation;
    }

    if (parsed.argon2Memory) {
        values["Argon2 memory"] = parsed.argon2Memory;
    }

    if (parsed.argon2Passes) {
        values["Argon2 passes"] = parsed.argon2Passes;
    }

    if (parsed.argon2Parallelism) {
        values["Argon2 parallelism"] = parsed.argon2Parallelism;
    }

    if (parsed.privateMac) {
        values["Private MAC"] = parsed.privateMac;
    }

    return {
        values
    };
}

export function inspectPpkUnlocked(
    text: string,
    bytes: Uint8Array,
    filePath: string,
    password: string
): CryptoInspection {
    const parsed = parsePpk(text);

    if (!parsed) {
        return {
            values: {
                Type: "PuTTY Private Key",
                Status: "Unlock failed",
                Summary: "The file does not contain a recognized PuTTY private key.",
                ...fileMetadata(bytes, filePath ),
            }
        };
    }

    const privateKeyPem = tryUnlockPpkWithPuttygen(bytes, password);

    if (!privateKeyPem) {
        return {
            values: {
                Type: "PuTTY Private Key",
                Version: parsed.version,
                Status: "Unlock failed",
                Algorithm: formatSshAlgorithm(parsed.algorithm),
                Encryption: parsed.encryption,
                Comment: parsed.comment,
                Summary: "Failed to unlock PuTTY private key. The password may be incorrect, the key may be unsupported, or puttygen may be unavailable.",
                ...fileMetadata(bytes, filePath ),
            }
        };
    }

    try {
        const privateKey = crypto.createPrivateKey({key: privateKeyPem, format: "pem"});
        const publicKey = crypto.createPublicKey(privateKey);
        const publicDer = publicKey.export({type: "spki", format: "der"}) as Buffer;

        const details =
            privateKey.asymmetricKeyDetails as
                | {modulusLength?: number; namedCurve?: string; }
                | undefined;

        const keySize = details?.modulusLength ? `${details.modulusLength} bits` : "";
        const curve = details?.namedCurve || "";

        return {
            values: {
                Type: "PuTTY Private Key",
                Version: parsed.version,
                Status: "Unlocked",
                Protection: parsed.encryption !== "none" ? "Password encrypted" : "None",
                Algorithm: formatSshAlgorithm(parsed.algorithm),
                "Key size": keySize,
                Curve: curve,
                Encryption: parsed.encryption,
                Comment: parsed.comment,
                "Public key SHA-256": sha256Hex(publicDer),
                ...fileMetadata(bytes, filePath ),
                Summary: buildUnlockedSummary(parsed, keySize, curve )
            },
            privateKeyPem
        };
    } catch {
        return {
            values: {
                Type: "PuTTY Private Key",
                Version: parsed.version,
                Status: "Unlock failed",
                Algorithm: formatSshAlgorithm(parsed.algorithm),
                Encryption: parsed.encryption,
                Comment: parsed.comment,
                Summary: "The PuTTY key was decrypted, but the exported private key could not be parsed.",
                ...fileMetadata(bytes, filePath ),
            }
        };
    }
}

interface ParsedPpk {
    version: string;
    algorithm: string;
    encryption: string;
    comment: string;
    keyDerivation: string;
    argon2Memory: string;
    argon2Passes: string;
    argon2Parallelism: string;
    argon2Salt: string;
    publicLines: string[];
    privateLines: string[];
    privateMac: string;
}

function parsePpk(
    text: string
): ParsedPpk | undefined {
    const normalized = text.replace(/\r\n/g, "\n");
    const lines = normalized.split("\n");
    const firstLine = lines[0]?.trim() || "";
    const headerMatch = firstLine.match(/^PuTTY-User-Key-File-(\d+):\s*(.+)$/i);

    if (!headerMatch) {
        return undefined;
    }

    const version = headerMatch[1].trim();
    const algorithm = headerMatch[2].trim();
    const fields = new Map<string, string>();

    let publicLines: string[] = [];
    let privateLines: string[] = [];

    for (let index = 1; index < lines.length; index++) {

        const line = lines[index];
        const fieldMatch = line.match(/^([^:]+):\s*(.*)$/);

        if (!fieldMatch) {
            continue;
        }

        const name = fieldMatch[1].trim();
        const value = fieldMatch[2].trim();

        if (name === "Public-Lines") {
            const count = parseLineCount(value);

            publicLines = lines
                .slice(index + 1, index + 1 + count)
                .map((item) => item.trim())
                .filter(Boolean);

            index += count;
            continue;
        }

        if (name === "Private-Lines") {
            const count = parseLineCount(value);

            privateLines = lines
                .slice(index + 1, index + 1 + count)
                .map((item) => item.trim())
                .filter(Boolean);

            index += count;
            continue;
        }

        fields.set(name.toLowerCase(),value);
    }

    return {
        version,
        algorithm,
        encryption: fieldValue(fields, "encryption") || "none",
        comment: fieldValue(fields, "comment"),
        keyDerivation: fieldValue(fields, "key-derivation"),
        argon2Memory: fieldValue(fields, "argon2-memory"),
        argon2Passes: fieldValue(fields, "argon2-passes"),
        argon2Parallelism: fieldValue(fields, "argon2-parallelism"),
        argon2Salt: fieldValue(fields, "argon2-salt"),
        publicLines,
        privateLines,
        privateMac: fieldValue(fields, "private-mac")
    };
}

function fieldValue(
    fields: Map<string, string>,
    name: string
): string {
    return (fields.get(name.toLowerCase()) || "");
}

function parseLineCount(
    value: string
): number {
    const count = Number.parseInt(value, 10);

    if (!Number.isFinite(count) || count < 0) {
        return 0;
    }

    return count;
}

function decodeBase64Lines(
    lines: string[]
): Buffer {
    try {
        return Buffer.from(lines.join(""), "base64");
    } catch {
        return Buffer.alloc(0);
    }
}

function sshFingerprint(
    publicKey: Buffer
): string {
    const digest = crypto
        .createHash("sha256")
        .update(publicKey)
        .digest("base64")
        .replace(/=+$/, "");

    return `SHA256:${digest}`;
}

function buildEncryptedSummary(
    parsed: ParsedPpk
): string {
    const parts = [
        `Encrypted PuTTY PPK v${parsed.version}`,
        formatSshAlgorithm(parsed.algorithm),
        `using ${parsed.encryption}`
    ];

    if (parsed.keyDerivation) {
        parts.push(`with ${parsed.keyDerivation}`);
    }

    return `${parts.join(" ")}.`;
}

function buildUnencryptedSummary(
    parsed: ParsedPpk
): string {
    return (
        `Unencrypted PuTTY PPK v${parsed.version} ` +
        `${formatSshAlgorithm(parsed.algorithm)} private key.`
    );
}

function buildUnlockedSummary(
    parsed: ParsedPpk,
    keySize: string,
    curve: string
): string {
    const parts = [
        `PuTTY PPK v${parsed.version}`,
        formatSshAlgorithm(parsed.algorithm),
        keySize,
        curve,
        "private key unlocked"
    ].filter(Boolean);

    return (
        `${parts.join(" ")}. ` +
        "Raw private key content is hidden."
    );
}
