export function readSshBinaryString(
    buffer: Buffer,
    offset: number
): {
    value: Buffer;
    nextOffset: number;
} {
    if (offset + 4 > buffer.length) {
        throw new Error("Invalid SSH binary string.");
    }

    const length = buffer.readUInt32BE(offset);
    const start = offset + 4;
    const end = start + length;

    if (end > buffer.length) {
        throw new Error("Invalid SSH binary string.");
    }

    return {
        value: buffer.subarray(start, end),
        nextOffset: end
    };
}

export function isEncryptedOpenSshPrivateKey(
    text: string
): boolean {
    try {
        const base64 = text
            .replace("-----BEGIN OPENSSH PRIVATE KEY-----", "")
            .replace("-----END OPENSSH PRIVATE KEY-----", "")
            .replace(/\s+/g, "");

        const decoded = Buffer.from(base64, "base64");
        const marker = Buffer.from("openssh-key-v1\0", "ascii");

        if (decoded.length < marker.length || !decoded.subarray(0, marker.length).equals(marker)) {
            return false;
        }

        const cipherName = readSshBinaryString(decoded, marker.length);

        return cipherName.value.toString("utf8") !== "none";

    } catch {
        return false;
    }
}
