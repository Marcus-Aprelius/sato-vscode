import { spawnSync } from "child_process";
import { fileMetadata } from "../fileMetadata";

import type { CryptoInspection } from "../types";

export function inspectLuks(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const result = spawnSync(
        "cryptsetup",
        ["luksDump", filePath],
        {encoding: "utf8", timeout: 30000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
    );

    if (result.error || result.status !== 0) {
        return {
            values: {
                Type: "LUKS Encrypted Container",
                Status: "Inspection unavailable",
                Protection: "Password encrypted",
                ...fileMetadata(bytes, filePath),
                Summary: "LUKS container detected. cryptsetup is required to inspect the header."
            }
        };
    }

    const details = String(result.stdout || "");
    const sanitizedDetails = sanitizeLuksDetails(details);
    const version = extractLuksValue(details, /^Version:\s*(.+)$/im);
    const uuid = extractLuksValue(details, /^UUID:\s*(.+)$/im);
    const label = extractLuksValue(details, /^Label:\s*(.+)$/im);
    const cipher = extractLuksValue(details, /^\s*cipher:\s*(.+)$/im);
    const sectorSize = extractLuksValue(details, /^\s*sector:\s*(.+)$/im);
    const keySize =extractLuksValue(details, /^\s*Key:\s*(.+)$/im);
    const pbkdf = extractLuksValue(details, /^\s*PBKDF:\s*(.+)$/im);
    const keySlots = collectActiveKeySlots(details);

    return {
        values: {
            Type: version === "2" ? "LUKS2 Encrypted Container" : version === "1" ? "LUKS1 Encrypted Container" : "LUKS Encrypted Container",
            Status: "Locked",
            Protection: "Password encrypted",
            Version: version,
            UUID: uuid,
            Label: normalizeOptionalLuksValue(label),
            Cipher: cipher,
            "Sector size": sectorSize,
            "Key size": keySize,
            PBKDF: pbkdf,
            "Active keyslots": keySlots.join(", "),
            "Active keyslot count": String(keySlots.length),
            ...fileMetadata(bytes, filePath),
            Details: sanitizedDetails,
            Summary: keySlots.length === 1 ? "LUKS encrypted container detected with 1 active keyslot." : `LUKS encrypted container detected with ${keySlots.length} active keyslots.`
        }
    };
}

export function inspectLuksUnlocked(
    bytes: Uint8Array,
    filePath: string,
    password: string
): CryptoInspection {
    const result = spawnSync(
        "cryptsetup",
        ["open", "--test-passphrase", "--key-file", "-", filePath],
        {input: `${password}\n`, encoding: "utf8", timeout: 30000, maxBuffer: 16 * 1024 * 1024, windowsHide: true}
    );

    if (result.error || result.status !== 0) {
        return {
            values: {
                Type: "LUKS Encrypted Container",
                Status: "Unlock failed",
                Protection: "Password encrypted",
                ...fileMetadata(bytes, filePath),
                Summary: "Wrong password or unsupported LUKS container."
            }
        };
    }

    const inspected = inspectLuks(bytes, filePath);

    return {
        values: {
            ...inspected.values,
            Status: "Unlocked",
            Protection: "Password encrypted",
            Summary: "LUKS password verified successfully. The container remains unmounted."
        }
    };
}

function extractLuksValue(
    details: string,
    pattern: RegExp
): string {
    return details.match(pattern)?.[1]?.trim() || "";
}

function normalizeOptionalLuksValue(
    value: string
): string {
    const normalized = value.trim();

    if (normalized === "(no label)" || normalized === "(no subsystem)" || normalized === "(no flags)") {
        return "";
    }

    return normalized;
}

function collectActiveKeySlots(
    details: string
): string[] {
    const keySlots: string[] = [];
    const lines = details.replace(/\r/g, "").split("\n");

    let inKeySlotsSection = false;

    for (const line of lines) {
        if (line.trim() === "Keyslots:") {
            inKeySlotsSection = true;
            continue;
        }

        if (inKeySlotsSection && (line.trim() === "Tokens:" || line.trim() === "Digests:")) {
            break;
        }

        if (!inKeySlotsSection) {
            continue;
        }

        const match = line.match(/^\s{2}(\d+):\s+\S+/);

        if (match?.[1]) {
            keySlots.push(match[1]);
        }
    }

    return keySlots;
}

function sanitizeLuksDetails(
    details: string
): string {
    const lines = details.replace(/\r/g, "").split("\n");

    const sanitized: string[] = [];
    let skipContinuation = false;

    for (const line of lines) {
        const trimmed = line.trimStart();

        if (trimmed.startsWith("Salt:") || trimmed.startsWith("Digest:")) {
            skipContinuation = true;
            continue;
        }

        if (skipContinuation && /^\s+[0-9a-f]{2}(?:\s+[0-9a-f]{2})+/i.test(line)) {
            continue;
        }

        skipContinuation = false;
        sanitized.push(line);
    }

    return sanitized.join("\n").trim();
}
