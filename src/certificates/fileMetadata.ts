import { sha256Hex } from "./format";

export function fileMetadata(
    bytes: Uint8Array,
    filePath: string
): Record<string, string> {
    return {
        "File path": filePath,
        "File size": `${bytes.length} bytes`,
        "SHA-256": sha256Hex(bytes)
    };
}

export function containerMetadata(
    bytes: Uint8Array,
    filePath: string
): Record<string, string> {
    return {
        "File path": filePath,
        "Container size": `${bytes.length} bytes`,
        "SHA-256": sha256Hex(bytes)
    };
}
