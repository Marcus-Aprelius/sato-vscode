import { testEncryptedZipPassword } from "./encryptedZip";
import { testArchivePassword } from "./sevenZipCli";
import { testUneggPassword } from "./uneggCli";

import type { ArchiveFormat } from "./types";

export async function testPasswordForArchive(
    archivePath: string,
    format: ArchiveFormat,
    password: string
): Promise<boolean> {
    if (format === "zip") {
        return testEncryptedZipPassword(archivePath, password);
    }

    if (format === "alz" || format === "egg") {
        return testUneggPassword(archivePath, password);
    }

    return testArchivePassword(archivePath, password);
}
