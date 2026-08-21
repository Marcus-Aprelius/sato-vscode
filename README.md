<img src="assets/sato.png" alt="sato">

# SATO - Secure Access Task Operator for VS Code

Open, browse, edit and manage KeePass `.kdbx` Database (DB), Password Safe `.psafe3` / `.ibak` vaults, and common crypto files directly inside VS Code `v1.100.0+`.

> **Status:** In development. Use in production environments at your own risk.

---

<img src="assets/sato-vscode2.gif" alt="sato-vscode">

---

![KDBX](https://img.shields.io/badge/.kdbx-✓-4CAF50)
![PSafe3](https://img.shields.io/badge/.psafe3-✓-4CAF50)
![IBAK](https://img.shields.io/badge/.ibak-✓-4CAF50)
![CRT](https://img.shields.io/badge/.crt-✓-2196F3)
![PEM](https://img.shields.io/badge/.pem-✓-2196F3)
![CSR](https://img.shields.io/badge/.csr-✓-2196F3)
![KEY](https://img.shields.io/badge/.key-✓-2196F3)
![P12](https://img.shields.io/badge/.p12-✓-F05032)
![PFX](https://img.shields.io/badge/.pfx-✓-F05032)
![JKS](https://img.shields.io/badge/.jks-✓-F05032)
![GPG](https://img.shields.io/badge/.gpg-✓-8A2BE2)
![GPG](https://img.shields.io/badge/.pgp-✓-8A2BE2)
![ASC](https://img.shields.io/badge/.asg-✓-8A2BE2)
![SIG](https://img.shields.io/badge/.sig-✓-8A2BE2)

---

## Security

- Passwords and decrypted data are held in memory only
- Vaults are re-encrypted on save
- OpenPGP keys use a temporary GPG directory
- Clipboard auto-clear and auto-lock are configurable
- No cloud services or telemetry

---

## Usage

1. Open any supported file.

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

Empty Password Safe folders require an entry to persist. 

| Format    | Required tool       | Status                                         |
|-----------|---------------------|------------------------------------------------|
| `.kdbx`   | -                   | Read and write                                 |
| `.psafe3` | -                   | Read and write (writing notes is limited)      |
| `.ibak`   | -                   | Read and write backup file (edit with caution) |
| `.crt`    | `OpenSSL`           | View certificate details                       |
| `.pem`    | `OpenSSL`           | View certificate, CSR or private key details   |
| `.csr`    | `OpenSSL`           | View certificate signing request details       |
| `.key`    | `OpenSSL`           | View private key metadata                      |
| `.p12`    | `OpenSSL`/`keytool` | View and unlock PKCS#12 container              |
| `.pfx`    | `OpenSSL`/`keytool` | View and unlock PKCS#12 container              |
| `.jks`    | `keytool`           | View and unlock Java KeyStore                  |
| `.gpg`    | `GPG`               | View and decrypt OpenPGP messages              |
| `.pgp`    | `GPG`               | View and decrypt OpenPGP messages              |
| `.asc`    | `GPG`               | View OpenPGP public and private keys           |
| `.sig`    | `GPG`               | View OpenPGP signature details                 |


## External Tools Installation

| OS                  | Installation / Commands                                                       |
|---------------------|-------------------------------------------------------------------------------|
| `Debian` / `Ubuntu` | `sudo apt update`<br>`sudo apt install -y openssl gnupg default-jre-headless` |
| `Fedora` / `RHEL`   | `sudo dnf install -y openssl gnupg2 java-latest-openjdk-headless`             |
| `Arch Linux`        | `sudo pacman -S openssl gnupg jre-openjdk-headless`                           |
| `Alpine Linux`      | `sudo apk add openssl gnupg openjdk17-jre-headless`                           |
| `macOS`             | `brew install openssl gnupg openjdk`                                          |
| `Windows`           | `OpenSSL for Windows`<br>`Gpg4win`<br>`OpenJDK or another Java Runtime`       |
| `Ensure`            | Ensure openssl, gpg, and keytool are available in PATH.                       |
| `Verify`            | `openssl`<br>`gpg --version`<br>`keytool -help` version`                      |

---

## Features

| Feature                | Details |
|------------------------|---------|
| **Vault management**   | Three-pane viewer for groups, entries, and details<br>Read and write `.kdbx`, `.psafe3`, and `.ibak` vaults<br>Create, edit, duplicate, and delete entries<br>Create, rename, and delete groups |
| **Crypto file viewer** | Inspect `.crt`, `.pem`, `.csr`, `.key`, `.p12`, `.pfx`, and `.jks`<br>Inspect `.gpg`, `.pgp`, `.asc`, and `.sig`<br>Unlock crypto containers and decrypt OpenPGP messages<br>View metadata, fingerprints, hashes, and decrypted content |
| **Quick actions**      | Show, hide, and copy passwords or private keys<br>Copy usernames, URLs, notes, paths, and fingerprints<br>Open URLs directly from entry details<br>Show or hide empty values |
| **Search**             | Search vault entries and crypto metadata<br>Search titles, usernames, URLs, notes, subjects, issuers, paths, and fingerprints |
| **Password generator** | Configurable length and character sets<br>Password strength indicator<br>Entry editor integration and one-click copy |
| **Security controls**  | Lock and reload vaults<br>Lock containers and hide decrypted content<br>Configurable auto-lock and clipboard auto-clear<br>Checks for required external tools |
| **Interface**          | File, Entry, Folder, Tools, View, and Help menus<br>File and database information<br>Status bar with vault statistics or crypto metadata<br>Update check from the Help menu |

---

## Extension Settings

| Setting                        | Description                                                                             |
|--------------------------------|-----------------------------------------------------------------------------------------|
| `sato.autoLockTimeout`         | Auto-lock vault after N minutes of inactivity.<br>`0` disables auto-lock.               |
| `sato.clipboardClearTimeout`   | Clear clipboard N seconds after copying a secret.<br>`0` disables clipboard auto-clear. |
| `sato.passwordGeneratorLength` | Default password length used by the generator.                                          |
| `sato.confirmBeforeDelete`     | Ask for confirmation before deleting entries or folders.                                |
| `sato.showPasswordsByDefault`  | Reveal passwords automatically in the entry details pane.                               |
| `sato.showStatusBar`           | Show or hide the vault statistics bar.                                                  |

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

Discord: Marcus.Aprelius.Antoninus
