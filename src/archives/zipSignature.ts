import * as fs from "fs";

const ZIP_SIGNATURES = new Set([0x04034b50, 0x06054b50, 0x08074b50]);

export async function hasZipSignature(
    filePath: string
): Promise<boolean> {
    const handle = await fs.promises.open(filePath, "r");

    try {
        const buffer = Buffer.alloc(4);
        const result = await handle.read(buffer, 0, buffer.length, 0);

        if (result.bytesRead < 4) {
            return false;
        }

        const signature = buffer.readUInt32LE(0);
        return ZIP_SIGNATURES.has(signature);

    } finally {
        await handle.close();
    }
}

export async function requireZipSignature(
    filePath: string
): Promise<void> {
    const valid = await hasZipSignature(filePath);

    if (!valid) {
        throw new Error("The file does not contain a valid ZIP signature.");
    }
}
