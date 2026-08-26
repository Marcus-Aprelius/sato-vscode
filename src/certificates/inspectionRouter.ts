import { isSshPrivateKeyFilePath } from "./fileTypes";
import { inspectAge } from "./inspectors/ageInspector";
import { inspectCms } from "./inspectors/cmsInspector";
import { inspectGpg } from "./inspectors/gpgInspector";
import { inspectJks } from "./inspectors/jksInspector";
import { inspectPpk } from "./inspectors/ppkInspector";

import { inspectPkcs7 } from "./inspectors/pkcs7Inspector";
import { inspectPkcs8 } from "./inspectors/pkcs8Inspector";
import { inspectPkcs12 } from "./inspectors/pkcs12Inspector";
import { inspectPemCryptoFile } from "./inspectors/pemInspector";
import { inspectSshPrivateKey } from "./inspectors/sshKeyInspector";

import type { CryptoInspection } from "./types";

export function inspectCryptoFile(
    text: string,
    bytes: Uint8Array,
    filePath: string
): CryptoInspection {
    const lowerPath = filePath.toLowerCase();

    if (lowerPath.endsWith(".pfx") || lowerPath.endsWith(".p12")) {
        return inspectPkcs12(bytes, filePath);
    }

    if (lowerPath.endsWith(".p7b") || lowerPath.endsWith(".p7c")) {
        return inspectPkcs7(bytes, filePath);
    }

    if (lowerPath.endsWith(".p7s") || lowerPath.endsWith(".p7m")) {
        return inspectCms(bytes, filePath);
    }

    if (lowerPath.endsWith(".p8") || lowerPath.endsWith(".pk8")) {
        return inspectPkcs8(bytes, filePath);
    }

    if (lowerPath.endsWith(".ppk")) {
        return inspectPpk(text, bytes, filePath);
    }

    if (lowerPath.endsWith(".age")) {
        return inspectAge(bytes, filePath);
    }

    if (isSshPrivateKeyFilePath(filePath)) {
        return inspectSshPrivateKey(text, bytes, filePath);
    }

    if (lowerPath.endsWith(".jks") || lowerPath.endsWith(".jceks")) {
        return inspectJks(bytes, filePath );
    }

    if (lowerPath.endsWith(".gpg") || lowerPath.endsWith(".pgp") || lowerPath.endsWith(".asc") || lowerPath.endsWith(".sig")) {
        return inspectGpg(bytes, filePath);
    }

    return inspectPemCryptoFile(text, bytes, filePath);
}
