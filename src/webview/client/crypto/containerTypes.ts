import type { ClientEntry } from "../types";

export function isCryptoContainer(
    entry: ClientEntry | undefined
): boolean {
    if (!entry || !entry.readOnly) {
        return false;
    }

    const type = entry.values?.Type || "";
    const status = entry.values?.Status || "";
    const protection = entry.values?.Protection || "";
    const encryption = entry.values?.Encryption || "";

    const encryptedPkcs8 = type === "PKCS#8 Private Key" && (status === "Locked" || protection === "Password encrypted");
    const encryptedPpk = type === "PuTTY Private Key" && (status === "Locked" || ( encryption !== "" && encryption.toLowerCase() !== "none"));
    const encryptedSshKey = type === "OpenSSH Private Key" && (status === "Locked" || protection === "Password encrypted");
    const encryptedPrivateKey = type === "Private Key" && (status === "Locked" || protection === "Password encrypted");

    return (
        type === "PKCS#12 Container" ||
        type === "Java KeyStore" ||
        type === "Java Cryptography Extension KeyStore" ||
        type === "OpenPGP Encrypted Message" ||
        encryptedPrivateKey ||
        encryptedPkcs8 ||
        encryptedPpk ||
        encryptedSshKey
    );
}

export function isCryptoContainerUnlocked(
    entry: ClientEntry | undefined
): boolean {
    return entry?.values?.Status === "Unlocked";
}

export function isOpenPgpMessage(
    entry: ClientEntry | undefined
): boolean {
    return (
        entry?.values?.Type === "OpenPGP Encrypted Message"
    );
}
