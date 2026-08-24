<img src="assets/sato.png" alt="sato">

# SATO - Secure Access Task Operator for VS Code

Open, browse, edit and manage KeePass `.kdbx` Database (DB), Password Safe `.psafe3` / `.ibak` vaults, and common [crypto files](#supported-formats) directly inside VS Code `v1.100.0+` with a single UI.

> **Status:** In development. Use in production environments at your own risk.

> Bugs? Questions? Suggestions? Welcome to [GitHub](https://github.com/Marcus-Aprelius/sato-vscode/issues).

---

<img src="assets/sato-vscode2.gif" alt="sato-vscode">

---

![KDBX](https://img.shields.io/badge/.kdbx-✓-4CAF50)
![PSafe3](https://img.shields.io/badge/.psafe3-✓-4CAF50)
![IBAK](https://img.shields.io/badge/.ibak-✓-4CAF50)
![1PIF](https://img.shields.io/badge/.1pif-✓-4CAF50)
![BCUP](https://img.shields.io/badge/.bcup-✓-4CAF50)
![CRT](https://img.shields.io/badge/.crt-✓-2196F3)
![DER](https://img.shields.io/badge/.der-✓-2196F3)
![CER](https://img.shields.io/badge/.cer-✓-2196F3)
![PEM](https://img.shields.io/badge/.pem-✓-2196F3)
![CSR](https://img.shields.io/badge/.csr-✓-2196F3)
![KEY](https://img.shields.io/badge/.key-✓-2196F3)

![P7S](https://img.shields.io/badge/.p7s-✓-dd7889)
![P7M](https://img.shields.io/badge/.p7m-✓-dd7889)
![P8](https://img.shields.io/badge/.p8-✓-dd7889)
![PK8](https://img.shields.io/badge/.pk8-✓-dd7889)
![P10](https://img.shields.io/badge/.p10-✓-dd7889)
![P12](https://img.shields.io/badge/.p12-✓-F05032)
![PFX](https://img.shields.io/badge/.pfx-✓-F05032)
![P7B](https://img.shields.io/badge/.p7b-✓-F05032)
![P7C](https://img.shields.io/badge/.p7c-✓-F05032)
![JKS](https://img.shields.io/badge/.jks-✓-F05032)
![JCEKS](https://img.shields.io/badge/.jceks-✓-F05032)

![GPG](https://img.shields.io/badge/.gpg-✓-8A2BE2)
![GPG](https://img.shields.io/badge/.pgp-✓-8A2BE2)
![ASC](https://img.shields.io/badge/.asg-✓-8A2BE2)
![SIG](https://img.shields.io/badge/.sig-✓-8A2BE2)
![PPK](https://img.shields.io/badge/.ppk-✓-8A2BE2)
![ID_RSA](https://img.shields.io/badge/id_rsa-✓-8A8D42)
![ID_ECDSA](https://img.shields.io/badge/id_ecdsa-✓-8A8D42)
![ID_ED25519](https://img.shields.io/badge/id_ed25519-✓-8A8D42)

---

## Security

- Passwords and decrypted data are held in memory only
- Vaults are re-encrypted on save
- OpenPGP keys use a temporary GPG directory
- Clipboard auto-clear and auto-lock are configurable
- No cloud services or telemetry

---

## Usage

1. Open vault or cryptofile of any [supported format](#supported-formats).

2. For vault files, enter the master password.

3. For crypto containers, use `Tools` → `Unlock Container` or the details pane button.

4. Use the toolbar or right-click context menus to manage groups, entries and crypto file actions.

5. Use `Tools` → `Lock Database` to lock a password vault.

6. Also, ommands from Command Palette `Ctrl/Cmd + Shift + P`:

  - `SATO: Open Password Vault`
  - `SATO: Lock Vault`
  - `SATO: Reload Vault`

---

## Supported Formats

| Type        | Format       | Required tool | Status                                               |
|-------------|--------------|---------------|------------------------------------------------------|
| Vault       | `.kdbx`      | -             | Read and write                                       |
| Vault       | `.psafe3`    | -             | Read and write (writing notes is limited)            |
| Vault       | `.ibak`      | -             | Read and write backup file (edit with caution)       |
| Vault       | `.1pif`      | -             | Read-only                                            |
| Vault       | `.bcup`      | -             | Read-only                                            |
| Crypto file | `.crt`       | -             | View X.509 certificate details                       |
| Crypto file | `.cer`       | -             | View X.509 certificate details                       |
| Crypto file | `.der`       | -             | View DER-encoded X.509 certificate details           |
| Crypto file | `.pem`       | -             | View certificate, CSR, or private key details        |
| Crypto file | `.key`       | -             | View private key metadata                            |
| Crypto file | `.csr`       | `OpenSSL`     | View certificate signing request details             |
| Crypto file | `.p10`       | `OpenSSL`     | View PKCS#10 certificate signing request details     |
| Crypto file | `.p12`       | `OpenSSL`     | View and unlock PKCS#12 container                    |
| Crypto file | `.pfx`       | `OpenSSL`     | View and unlock PKCS#12 container                    |
| Crypto file | `.p7b`       | `OpenSSL`     | View PKCS#7 certificate chain                        |
| Crypto file | `.p7c`       | `OpenSSL`     | View PKCS#7 certificate chain                        |
| Crypto file | `.p7s`       | `OpenSSL`     | View PKCS#7 digital signature details                |
| Crypto file | `.p7m`       | `OpenSSL`     | View CMS/S/MIME message details                      |
| Crypto file | `.p8`        | -             | View PKCS#8 private key                              |
| Crypto file | `.pk8`       | -             | View and unlock PKCS#8 private key                   |
| Crypto file | `.ppk`       | `puttygen`    | View and unlock PuTTY private keys                   |
| Crypto file | `id_rsa`     | `ssh-keygen`  | View and unlock OpenSSH RSA private keys             |
| Crypto file | `id_ecdsa`   | `ssh-keygen`  | View and unlock OpenSSH ECDSA private keys           |
| Crypto file | `id_ed25519` | `ssh-keygen`  | View and unlock OpenSSH Ed25519 private keys         |
| Crypto file | `.jks`       | `keytool`     | View and unlock Java KeyStore                        |
| Crypto file | `.jceks`     | `keytool`     | View and unlock Java Cryptography Extension KeyStore |
| Crypto file | `.gpg`       | `GPG`         | View and decrypt OpenPGP messages                    |
| Crypto file | `.pgp`       | `GPG`         | View and decrypt OpenPGP messages                    |
| Crypto file | `.asc`       | `GPG`         | View OpenPGP public and private keys                 |
| Crypto file | `.sig`       | `GPG`         | View OpenPGP signature details                       |


## External Tools Installation

| OS                  | Installation / Commands                                                                 |
|---------------------|-----------------------------------------------------------------------------------------|
| `Debian` / `Ubuntu` | `sudo apt install -y openssl gnupg default-jre-headless putty-tools openssh-client`     |
| `Fedora` / `RHEL`   | `sudo dnf install -y openssl gnupg2 java-latest-openjdk-headless putty openssh-clients` |
| `Arch Linux`        | `sudo pacman -S openssl gnupg jre-openjdk-headless putty openssh`                       |
| `Alpine Linux`      | `sudo apk add openssl gnupg openjdk17-jre-headless putty openssh-client`                |
| `macOS`             | `brew install openssl gnupg openjdk putty`                                              |
| `Windows`           | **Install:**<br>- `Gpg4win`<br>- `OpenSSL for Windows`<br>- `OpenJDK or another Java Runtime`<br>- `PuTTY` (includes `puttygen`)<br>- `OpenSSH Client` Windows optional feature<br>**Ensure:**<br>- `openssl`, `gpg` and `keytool` are available in PATH<br>**Verify:**<br>- `openssl version`<br>- `gpg --version`<br>- `keytool -help`<br>- `puttygen --version`                              |

---

## Features

| Feature                | Details |
|------------------------|---------|
| **Vault management**   | Three-pane viewer for groups, entries, and details<br>Read and write vaults from **Supported Formats**<br>Create, edit, duplicate, and delete entries<br>Create, rename, and delete groups |
| **Crypto file viewer** | Inspect different crypto files from **Supported Formats**<br>Unlock crypto containers<br>Decrypt OpenPGP messages<br>View metadata, fingerprints, hashes, and decrypted content |
| **Quick actions**      | Show, hide, and copy passwords or private keys<br>Copy usernames, URLs, notes, paths, and fingerprints<br>Open URLs directly from entry details<br>Show or hide empty values |
| **Search**             | Search vault entries and crypto metadata<br>Search titles, usernames, URLs<br>Search notes, subjects, issuers, paths, and fingerprints |
| **Password generator** | Configurable length and character sets<br>Password strength indicator<br>Entry editor integration and one-click copy |
| **Security controls**  | Lock and reload vaults<br>Lock containers and hide decrypted content<br>Configurable auto-lock and clipboard auto-clear<br>Checks for required external tools |
| **Interface**          | File, Entry, Folder, Tools, View, and Help menus<br>File and database information<br>Status bar with vault statistics or crypto metadata<br>Update check from the Help menu |

---

## Extension Settings

| Setting                        | Description                                                                            |
|--------------------------------|----------------------------------------------------------------------------------------|
| `sato.autoLockTimeout`         | Auto-lock vault after N minutes of inactivity.<br>`0` disables auto-lock               |
| `sato.clipboardClearTimeout`   | Clear clipboard N seconds after copying a secret.<br>`0` disables clipboard auto-clear |
| `sato.passwordGeneratorLength` | Default password length used by the generator                                          |
| `sato.confirmBeforeDelete`     | Ask for confirmation before deleting entries or folders                                |
| `sato.showPasswordsByDefault`  | Reveal passwords automatically in the entry details pane                               |
| `sato.showStatusBar`           | Show or hide the vault statistics bar                                                  |

---

## Development

Open folder `.devcontainer` in VSCode and use commands:

| Action                            | Command                                                                 |
|-----------------------------------|-------------------------------------------------------------------------|
| 1. Install dependencies           | `npm install`                                                           |
| 2. Build the project              | `npm run build`                                                         |
| 3. Package `.vsix` extension      | `npm run package`                                                       |
| 4. Install generated `.vsix` file | `code --install-extension files/sato-vscode-ext-<version>.vsix --force` |

---

## Repository
**VS Code extension**: https://github.com/Marcus-Aprelius/sato-vscode

**SATO command line tool**: https://github.com/Marcus-Aprelius/sato

---

[MIT LICENSE](LICENSE)

---

© 2026 [Marcus-Aprelius](https://github.com/Marcus-Aprelius/sato-vscode)

**Discord:** Marcus.Aprelius.Antoninus
