import * as fs from "fs";
import * as path from "path";

import type { CryptoInspection } from "../types";

import { sha256Hex } from "../format";
import { spawnSync } from "child_process";
import { fileMetadata } from "../fileMetadata";
import { createTemporaryDirectory, removeTemporaryDirectory} from "../cli/tempDirectory";

export function inspectAge(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    
    const encoding = detectAgeEncoding(bytes);
    const recipientType = detectRecipientType(bytes);

    return {
        values: {
            Type: "age Encrypted File",
            Encoding: encoding,
            Status: "Locked",
            Protection: recipientType,
            ...fileMetadata(bytes, filePath),
            Summary: recipientType === "Passphrase"
                ? "Passphrase-encrypted age file detected."
                : "Recipient-encrypted age file detected. An identity file may be required."
        }
    };
}

export function inspectAgeUnlocked(
    bytes: Uint8Array,
    filePath: string,
    password: string
): CryptoInspection {
    
    const encoding = detectAgeEncoding(bytes);
    const recipientType = detectRecipientType(bytes);

    if (recipientType !== "Passphrase") {
        return {
            values: {
                Type: "age Encrypted File",
                Encoding: encoding,
                Status: "Unlock failed",
                Protection: recipientType,
                ...fileMetadata(bytes, filePath),
                Summary: "This age file requires an identity file. Passphrase unlocking is not supported for this recipient type."
            }
        };
    }

    const decrypted = decryptAgeWithPassphrase(bytes, password);

    if (!decrypted) {
        return {
            values: {
                Type: "age Encrypted File",
                Encoding: encoding,
                Status: "Unlock failed",
                Protection: "Passphrase",
                ...fileMetadata(bytes, filePath),
                Summary: "Failed to decrypt age file. The passphrase may be incorrect or the age command may be unavailable."
            }
        };
    }

    const content = formatDecryptedContent(decrypted);

    return {
        values: {
            Type: "age Encrypted File",
            Encoding: encoding,
            Status: "Unlocked",
            Protection: "Passphrase",
            "Decrypted format": content.format,
            "Decrypted size": `${decrypted.length} bytes`,
            "Decrypted SHA-256": sha256Hex(decrypted),
            "Decrypted content": content.value,
            ...fileMetadata(bytes, filePath),
            Summary: "age file decrypted successfully. Decrypted content is available in read-only mode."
        }
    };
}

function decryptAgeWithPassphrase(
    bytes: Uint8Array,
    password: string
): Uint8Array | undefined {
    let temporaryDirectory = "";

    try {
        temporaryDirectory = createTemporaryDirectory("sato-age-");

        const inputPath = path.join(temporaryDirectory, "encrypted.age");
        fs.writeFileSync(inputPath, Buffer.from(bytes), {mode: 0o600});

        const result = spawnSync(
            "age",
            ["--decrypt", inputPath ],
            {env: {...process.env, AGE_PASSPHRASE: password }, encoding: null, maxBuffer: 32 * 1024 * 1024, timeout: 30000, windowsHide: true}
        );

        if (result.error || result.status !== 0 || !result.stdout) {
            return undefined;
        }

        return new Uint8Array(result.stdout);

    } catch {
        return undefined;

    } finally {
        removeTemporaryDirectory(temporaryDirectory);
    }
}

function detectAgeEncoding(
    bytes: Uint8Array
): "ASCII Armor" | "Binary" {
    const prefix = Buffer.from(bytes).subarray(0, Math.min(bytes.length, 128)).toString("ascii");

    return prefix.includes("-----BEGIN AGE ENCRYPTED FILE-----") ? "ASCII Armor" : "Binary";
}

function detectRecipientType(
    bytes: Uint8Array
): "Passphrase" | "Identity" {
    const text = ageHeaderText(bytes);

    return (text.includes("-> scrypt ") || text.includes("\n-> scrypt\n")) ? "Passphrase" : "Identity";
}

function ageHeaderText(
    bytes: Uint8Array
): string {
    const prefix = Buffer.from(bytes)
        .subarray(0, Math.min(bytes.length, 16384))
        .toString("utf8");

    if (!prefix.includes("-----BEGIN AGE ENCRYPTED FILE-----")) {
        return prefix;
    }

    const armoredBody = prefix
        .replace("-----BEGIN AGE ENCRYPTED FILE-----", "")
        .replace(/-----END AGE ENCRYPTED FILE-----[\s\S]*/,"")
        .replace(/\s+/g, "");

    try {
        return Buffer.from(armoredBody, "base64").toString("utf8");

    } catch {
        return prefix;
    }
}

function formatDecryptedContent(
    bytes: Uint8Array
): {
    format: "UTF-8 text" | "Base64";
    value: string;
} {
    const buffer = Buffer.from(bytes);
    const text = buffer.toString("utf8");

    if (Buffer.from(text, "utf8").equals(buffer) && !text.includes("\u0000")) {
        return {format: "UTF-8 text", value: text};
    }

    return {
        format: "Base64",
        value: buffer.toString("base64")
    };
}
