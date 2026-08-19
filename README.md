<img src="assets/sato.png" alt="sato">

# SATO - Secure Access Task Operator for VS Code

Open, browse, edit and manage KeePass `.kdbx` Database (DB), Password Safe `.psafe3` / `.ibak` vaults, and common crypto files directly inside VS Code `v1.100.0+`.

> **Status:** In development. Use in production environments at your own risk.

---

<img src="assets/sato-vscode2.gif" alt="sato-vscode">

---

[![Release](https://img.shields.io/github/v/release/Marcus-Aprelius/sato-vscode)](https://github.com/Marcus-Aprelius/sato-vscode/releases)
[![License MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-007ACC?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=MarcusApreliusAntoninus.sato-vscode-ext)
[![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white)](https://github.com/Marcus-Aprelius/sato-vscode)
![Discord: Marcus.Aprelius.Antoninus](https://img.shields.io/badge/Discord-Marcus.Aprelius.Antoninus-5865F2?logo=discord&logoColor=white)

![KDBX](https://img.shields.io/badge/.kdbx-support-4CAF50)
![PSafe3](https://img.shields.io/badge/.psafe3-support-4CAF50)
![IBAK](https://img.shields.io/badge/.ibak-support-4CAF50)
![CRT](https://img.shields.io/badge/.crt-support-2196F3)
![PEM](https://img.shields.io/badge/.pem-support-2196F3)
![CSR](https://img.shields.io/badge/.csr-support-2196F3)
![KEY](https://img.shields.io/badge/.key-support-2196F3)
![P12](https://img.shields.io/badge/.p12-support-2196F3)
![PFX](https://img.shields.io/badge/.pfx-support-2196F3)
![JKS](https://img.shields.io/badge/.jks-support-2196F3)

---

## Security

- The master password is only held in memory while the editor tab is open
- KeePass `.kdbx` files are re-encrypted with the same credentials on every save
- Password Safe `.psafe3` and `.ibak` files are saved using the Password Safe file format
- Clipboard auto-clear can be configured in extension settings
- Auto-lock can be configured in extension settings
- Nothing leaves the extension host. No cloud services, no telemetry
- Password Safe notes are currently displayed, but writing notes back to `.psafe3` is limited by the current password-safe npm package API
- Empty Password Safe folders may be shown during the current session. To persist a new folder reliably, create an entry inside that folder
- `.ibak` files are Password Safe backup files. They can be opened with the same master password as the original `.psafe3` database. Editing them is technically supported, but it is recommended to save or restore them intentionally

---

## Supported Formats

| Format    | Status                                       |
|-----------|----------------------------------------------|
| `.kdbx`   | Read and write                               |
| `.psafe3` | Read and write                               |
| `.ibak`   | Read and write backup file                   |
| `.crt`    | View certificate details                     |
| `.pem`    | View certificate, CSR or private key details |
| `.csr`    | View certificate signing request details     |
| `.key`    | View private key metadata                    |
| `.p12`    | View and unlock PKCS#12 container            |
| `.pfx`    | View and unlock PKCS#12 container            |
| `.jks`    | View and unlock Java KeyStore                |

---

## Features

- **Vault viewer:**
  - Three-pane layout: groups tree, entry list, entry details
  - Works directly inside VS Code custom editor
   
- **KeePass KDBX support:**
  - Open KDBX 3 and KDBX 4 vaults
  - Create, edit, duplicate and delete entries
  - Create, rename and delete groups
  - Save changes back to the `.kdbx` file
 
- **Password Safe support:**
  - Open `.psafe3` databases and `.ibak` intermediate backup files
  - Create, edit, duplicate and delete entries
  - Create, rename and delete groups
  - Save changes back to the Password Safe file

- **Crypto file viewer:**
  - View `.crt`, `.csr`, `.key` and `.pem` files
  - View `.p12`, `.pfx` and `.jks` containers
  - Unlock and lock crypto containers
  - Show certificate subject, issuer, validity, fingerprints and public key info
  - Show CSR subject, public key algorithm, key size and signature algorithm
  - Show private key metadata while keeping raw private key content hidden by default

- **Actions:**
  - **Entry actions:**
    - Show and hide password
    - Copy username, password, URL, notes
    - Open URL with the **Go** button

  - **Crypto actions:**
    - Show and hide primary key
    - Show and hide empty values
    - Lock and unlock crypto containers
    - Copy summary, file path, fingerprints and hashes

- **Main menu:**
  - `File`: open files, find crypto files in directory, reload from disk, show file or database info
  - `Entry`: add, edit, duplicate and delete entries
  - `Folder`: add, rename and delete folders
  - `Tools`: lock or unlock database, lock or unlock container, password generator
  - `View`: show empty values, show primary key, show status bar
  - `Help`: home page, check update, about

- **Password generator**
  - Integration with the entry editor
  - Configurable password length, uppercase, lowercase, digits and symbols
  - Strength indicator
  - One-click copy

- **Search**
  - Search by title, username, URL and notes
  - Search crypto file fields such as subject, issuer, fingerprint, file path and summary
  - Debounced input for smoother typing

- **Statistics bar**
  - Show information about Groups and entries
  - Crypto file type and selected metadata
  - Duplicate passwords or empty groups
  - Weak or expired passwords
 
- **Session controls**
  - Reload from disk
  - Lock and Unlock database
  - Auto-lock after inactivity
  - Clipboard auto-clear after copying secrets

- **Update check**
  - Check for the latest SATO release from the Help menu
  - Shows whether SATO is up to date or a new version is available

---

## Usage

1. Open any supported file: `.kdbx`, `.psafe3`, `.ibak`, `.crt`, `.csr`, `.key`, `.pem`, `.p12`, `.pfx`, `.jks`.

2. For vault files, enter the master password.

3. For crypto containers, use `Tools` → `Unlock Container` or the details pane button.

4. Use the toolbar or right-click context menus to manage groups, entries and crypto file actions.

4. Use `Tools` → `Lock Database` to lock a password vault.

5. Also, ommands from Command Palette `Ctrl/Cmd + Shift + P`:

  - `SATO: Open Password Vault`
  - `SATO: Lock Vault`
  - `SATO: Reload Vault`

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
* compile TypeScript to dist/
  ```bash
  npm install
  ```

* run project build
  ```bash
  npm run build
  ```

* build file `sato-vscode-<version>.vsix`
  ```bash
  npm run package
  ```

* install generated `.vsix` file:
  ```bash
  code --install-extension files/sato-vscode-ext-<version>.vsix --force
  ```

---

## Repository

**VS Code extension**: [https://github.com/Marcus-Aprelius/sato-vscode](https://github.com/Marcus-Aprelius/sato-vscode)

**SATO command line tool**: [https://github.com/Marcus-Aprelius/sato](https://github.com/Marcus-Aprelius/sato)

---

© 2026 [Marcus-Aprelius](https://github.com/Marcus-Aprelius/sato-vscode)
