export function sshAlgorithmFromFilePath(
    filePath: string
): string {
    const fileName = filePath.replace(/\\/g, "/").split("/").pop() ?.toLowerCase();

    switch (fileName) {
        case "id_rsa":
            return "RSA";

        case "id_ecdsa":
            return "ECDSA";

        case "id_ed25519":
            return "Ed25519";

        default:
            return "SSH";
    }
}

export function formatSshAlgorithm(
    algorithm: string
): string {
    switch (algorithm.toLowerCase()) {
        case "ssh-rsa":
            return "RSA";

        case "ssh-dss":
            return "DSA";

        case "ssh-ed25519":
            return "Ed25519";

        case "ssh-ed448":
            return "Ed448";

        case "ecdsa-sha2-nistp256":
            return "ECDSA P-256";

        case "ecdsa-sha2-nistp384":
            return "ECDSA P-384";

        case "ecdsa-sha2-nistp521":
            return "ECDSA P-521";

        default:
            return algorithm;
    }
}
