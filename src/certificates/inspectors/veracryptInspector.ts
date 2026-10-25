import { fileMetadata } from "../fileMetadata";

import type { CryptoInspection } from "../types";

export function inspectVeraCrypt(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    return {
        values: {
            Type: "VeraCrypt Container",
            Protection: "Encrypted",
            ...fileMetadata(bytes, filePath),
            Summary: "VeraCrypt container detected. Metadata inspection only."
        }
    };
}
