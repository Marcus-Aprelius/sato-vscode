export const PASSWORD_VAULT_EXTENSIONS = ["kdbx", "psafe3", "ibak", "1pif", "bcup"] as const;

export const CRYPTO_FILE_EXTENSIONS = [
    "crt", "cer", "der", "pem", "csr", "p10", "key", "rsa", "luks","pub",
    "pfx", "p12", "p7b", "p7c", "p7s", "p7m", "spc", "jceks", "pk8", "ppk",
    "age", "jks", "p8", "gpg", "pgp", "asc", "sig", "ec", "hc", "tc", "bks"
] as const;

export const ARCHIVE_FILE_EXTENSIONS = [
    "zip", "zipx", "7z", "rar", "alz", "egg", "dmg", "deb", "rpm", "gz", "cab", "cpio",
    "ar", "a", "lib", "tar", "tar.gz", "tgz", "tar.bz2","tbz2", "tar.xz", "txz", "bz2", "xz", "aia",
    "appxbundle", "asice", "ear", "epub", "ipa", "jar", "vsix", "mcaddon", "mcpack", "mcproject", "z",
    "mctemplate", "mcworld", "mrpack", "nupkg", "sb2", "sb3", "war", "whl", "xlsx", "xpi", "pbix", 
    "tar.zst", "tzst", "tar.z", "taz", "zst", "lzma", "lzh", "lha", "arj", "xar", "chm", "chw", "pbit"
] as const;

export const EDITABLE_ARCHIVE_FILE_EXTENSIONS = ["zip"] as const;
export const SSH_KEY_FILE_NAMES = [ "id_rsa", "id_rsa.pub", "id_ecdsa", "id_ecdsa.pub", "id_ed25519", "id_ed25519.pub"] as const;
export const SUPPORTED_VAULT_EXTENSIONS = [...PASSWORD_VAULT_EXTENSIONS, ...CRYPTO_FILE_EXTENSIONS, ...ARCHIVE_FILE_EXTENSIONS] as const;
export type SupportedFileCategory = | "vaults" | "archives" | "ssh" | "crypto";

export function supportedFileCategory(
    fileName: string
): SupportedFileCategory | undefined {
    const normalizedName = normalizeBackupFileName(fileName.trim().toLowerCase());

    if (SSH_KEY_FILE_NAMES.some(supportedName => normalizedName === supportedName)) {
        return "ssh";
    }

    const extension = supportedFileExtension(normalizedName);

    if (!extension) {
        return undefined;
    }

    if (PASSWORD_VAULT_EXTENSIONS.some(supportedExtension => extension === supportedExtension)) {
        return "vaults";
    }

    if (ARCHIVE_FILE_EXTENSIONS.some(supportedExtension => extension === supportedExtension)) {
        return "archives";
    }

    if (CRYPTO_FILE_EXTENSIONS.some(supportedExtension => extension === supportedExtension)) {
        return "crypto";
    }

    return undefined;
}

export function isSupportedFileName(
    fileName: string
): boolean {
    return (supportedFileCategory(fileName) !== undefined);
}

function supportedFileExtension(
    fileName: string
): string | undefined {
    const compoundExtensions = [...ARCHIVE_FILE_EXTENSIONS].sort((left, right) => right.length - left.length);

    for (const extension of compoundExtensions) {
        if (fileName.endsWith(`.${extension}`)) {
            return extension;
        }
    }

    const dotIndex = fileName.lastIndexOf(".");

    if (dotIndex < 0 || dotIndex === fileName.length - 1) {
        return undefined;
    }

    return fileName.slice(dotIndex + 1);
}

export function isSatoBackupFileName(
    fileName: string
): boolean {
    return fileName.trim().toLowerCase().endsWith(".bak");
}

export function normalizeBackupFileName(
    fileName: string
): string {
    const normalizedName = fileName.trim().toLowerCase();

    if (!normalizedName.endsWith(".bak")) {
        return normalizedName;
    }

    return normalizedName.slice(0, -4);
}
