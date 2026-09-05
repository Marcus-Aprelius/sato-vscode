export const PASSWORD_VAULT_EXTENSIONS = [
    "kdbx",
    "psafe3",
    "ibak",
    "1pif",
    "bcup"
] as const;

export const CRYPTO_FILE_EXTENSIONS = [
    "crt",
    "cer",
    "der",
    "pem",
    "csr",
    "p10",
    "key",
    "pub",
    "pfx",
    "p12",
    "p7b",
    "p7c",
    "p7s",
    "p7m",
    "p8",
    "pk8",
    "ppk",
    "age",
    "jks",
    "jceks",
    "gpg",
    "pgp",
    "asc",
    "sig"
] as const;

export const SSH_PRIVATE_KEY_FILE_NAMES = [
    "id_rsa",
    "id_ecdsa",
    "id_ed25519"
] as const;

export const SUPPORTED_VAULT_EXTENSIONS = [
    ...PASSWORD_VAULT_EXTENSIONS,
    ...CRYPTO_FILE_EXTENSIONS
] as const;
