import { runWithTempFile } from "../cli";
import { containerMetadata } from "../fileMetadata";

import type { CryptoInspection } from "../types";

export function inspectBks(
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    return {
        values: {
            Type: "Bouncy Castle KeyStore",
            Status: "Locked",
            Summary: "Bouncy Castle KeyStore detected. Password required to inspect aliases and certificates.",
            ...containerMetadata(bytes, filePath)
        }
    };
}

export function inspectBksUnlocked(
    bytes: Uint8Array,
    filePath: string,
    password: string
): CryptoInspection {
    const output = runWithTempFile(bytes, "keystore.bks", "keytool", tmpFile =>
        [ "-list", "-v", "-storetype", "BKS", "-keystore", tmpFile, "-storepass", password]
    );

    if (!output.ok) {
        return {
            values: {
                Type: "Bouncy Castle KeyStore",
                Status: "Unlock failed",
                Summary: "Wrong password or unsupported BKS keystore.",
                ...containerMetadata(bytes, filePath)
            }
        };
    }

    return {
        values: {
            Type: "Bouncy Castle KeyStore",
            Status: "Unlocked",
            ...containerMetadata(bytes, filePath),
            Details: output.text.trim(),
            Summary: "BKS keystore unlocked."
        }
    };
}
