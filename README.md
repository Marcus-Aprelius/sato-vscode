<img src="assets/sato.png" alt="SATO">

# SATO - Secure Access Task Operator for VS Code

Open, browse, edit and manage vaults (`.kdbx`, `.psafe3`, `.ibak`), supported archives, ZIP-based application containers and common [crypto files](#supported-formats) directly inside VS Code `v1.120.0+` with a single UI.

> **⚠️ Status:** In development!⚠️ Use in production environments at your own risk!⚠️

> **💬 Feedback:** Bugs? Questions? Suggestions? Welcome to [GitHub](https://github.com/Marcus-Aprelius/sato-vscode/issues).

---

<img src="assets/sato-vscode2.gif" alt="sato-vscode">

---

<!-- Password vaults -->
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
![P10](https://img.shields.io/badge/.p10-✓-2196F3)

<!-- Private and public keys -->
![KEY](https://img.shields.io/badge/.key-✓-DD7889)
![RSA](https://img.shields.io/badge/.rsa-✓-DD7889)
![EC](https://img.shields.io/badge/.ec-✓-DD7889)
![PUB](https://img.shields.io/badge/.pub-✓-DD7889)
![P8](https://img.shields.io/badge/.p8-✓-DD7889)
![PK8](https://img.shields.io/badge/.pk8-✓-DD7889)
![ID_RSA](https://img.shields.io/badge/id__rsa-✓-8A8D42)
![ID_ECDSA](https://img.shields.io/badge/id__ecdsa-✓-8A8D42)
![ID_ED25519](https://img.shields.io/badge/id__ed25519-✓-8A8D42)

<!-- Certificate and key containers -->
![P12](https://img.shields.io/badge/.p12-✓-F05032)
![PFX](https://img.shields.io/badge/.pfx-✓-F05032)
![P7B](https://img.shields.io/badge/.p7b-✓-F05032)
![P7C](https://img.shields.io/badge/.p7c-✓-F05032)
![P7S](https://img.shields.io/badge/.p7s-✓-F05032)
![P7M](https://img.shields.io/badge/.p7m-✓-F05032)
![SPC](https://img.shields.io/badge/.spc-✓-F05032)
![JKS](https://img.shields.io/badge/.jks-✓-F05032)
![JCEKS](https://img.shields.io/badge/.jceks-✓-F05032)

<!-- Encryption and secure containers -->
![GPG](https://img.shields.io/badge/.gpg-✓-8A2BE2)
![PGP](https://img.shields.io/badge/.pgp-✓-8A2BE2)
![ASC](https://img.shields.io/badge/.asc-✓-8A2BE2)
![SIG](https://img.shields.io/badge/.sig-✓-8A2BE2)
![PPK](https://img.shields.io/badge/.ppk-✓-8A2BE2)
![AGE](https://img.shields.io/badge/.age-✓-8A2BE2)
![LUKS](https://img.shields.io/badge/.luks-✓-8A2BE2)

<!-- Archives and disk images -->
![ZIP](https://img.shields.io/badge/.zip-✓-FFB300)
![ZIPX](https://img.shields.io/badge/.zipx-✓-FFB300)
![7Z](https://img.shields.io/badge/.7z-✓-FFB300)
![RAR](https://img.shields.io/badge/.rar-✓-FFB300)
![ALZ](https://img.shields.io/badge/.alz-✓-FFB300)
![EGG](https://img.shields.io/badge/.egg-✓-FFB300)
![DMG](https://img.shields.io/badge/.dmg-✓-FFB300)
![TAR](https://img.shields.io/badge/.tar-✓-FFB300)
![TAR.GZ](https://img.shields.io/badge/.tar.gz-✓-FFB300)
![TGZ](https://img.shields.io/badge/.tgz-✓-FFB300)
![TAR.BZ2](https://img.shields.io/badge/.tar.bz2-✓-FFB300)
![TBZ2](https://img.shields.io/badge/.tbz2-✓-FFB300)
![TAR.XZ](https://img.shields.io/badge/.tar.xz-✓-FFB300)
![TXZ](https://img.shields.io/badge/.txz-✓-FFB300)
![GZ](https://img.shields.io/badge/.gz-✓-FFB300)
![BZ2](https://img.shields.io/badge/.bz2-✓-FFB300)
![XZ](https://img.shields.io/badge/.xz-✓-FFB300)
![AIA](https://img.shields.io/badge/.aia-✓-FFB300)
![APPX Bundle](https://img.shields.io/badge/.appxbundle-✓-FFB300)
![ASiC-E](https://img.shields.io/badge/.asice-✓-FFB300)
![EAR](https://img.shields.io/badge/.ear-✓-FFB300)
![EPUB](https://img.shields.io/badge/.epub-✓-FFB300)
![IPA](https://img.shields.io/badge/.ipa-✓-FFB300)
![JAR](https://img.shields.io/badge/.jar-✓-FFB300)
![MC Add-on](https://img.shields.io/badge/.mcaddon-✓-FFB300)
![MC Pack](https://img.shields.io/badge/.mcpack-✓-FFB300)
![XPI](https://img.shields.io/badge/.xpi-✓-FFB300)
![MC Project](https://img.shields.io/badge/.mcproject-✓-FFB300)
![MC Template](https://img.shields.io/badge/.mctemplate-✓-FFB300)
![MC World](https://img.shields.io/badge/.mcworld-✓-FFB300)
![MRPACK](https://img.shields.io/badge/.mrpack-✓-FFB300)
![NUPKG](https://img.shields.io/badge/.nupkg-✓-FFB300)
![PBIX](https://img.shields.io/badge/.pbix-✓-FFB300)
![PBIT](https://img.shields.io/badge/.pbit-✓-FFB300)
![SB2](https://img.shields.io/badge/.sb2-✓-FFB300)
![SB3](https://img.shields.io/badge/.sb3-✓-FFB300)
![VSIX](https://img.shields.io/badge/.vsix-✓-FFB300)
![WAR](https://img.shields.io/badge/.war-✓-FFB300)
![WHL](https://img.shields.io/badge/.whl-✓-FFB300)
![XLSX](https://img.shields.io/badge/.xlsx-✓-FFB300)
![DEB](https://img.shields.io/badge/.deb-✓-FFB300)
![RPM](https://img.shields.io/badge/.rpm-✓-FFB300)
![CAB](https://img.shields.io/badge/.cab-✓-FFB300)
![CPIO](https://img.shields.io/badge/.cpio-✓-FFB300)
![AR](https://img.shields.io/badge/.ar-✓-FFB300)
![Static Library A](https://img.shields.io/badge/.a-✓-FFB300)
![Static Library LIB](https://img.shields.io/badge/.lib-✓-FFB300)
![ZST](https://img.shields.io/badge/.zst-✓-FFB300)
![TAR.ZST](https://img.shields.io/badge/.tar.zst-✓-FFB300)
![TZST](https://img.shields.io/badge/.tzst-✓-FFB300)
![LZMA](https://img.shields.io/badge/.lzma-✓-FFB300)
![Z](https://img.shields.io/badge/.z-✓-FFB300)
![TAR.Z](https://img.shields.io/badge/.tar.z-✓-FFB300)
![TAZ](https://img.shields.io/badge/.taz-✓-FFB300)
![LZH](https://img.shields.io/badge/.lzh-✓-FFB300)
![LHA](https://img.shields.io/badge/.lha-✓-FFB300)
![ARJ](https://img.shields.io/badge/.arj-✓-FFB300)
![XAR](https://img.shields.io/badge/.xar-✓-FFB300)

---

## Security Considerations

- Passwords are retained only for the active session and are not persisted
- Temporary decrypted data created for Preview or external CLI operations is stored in restricted temporary locations and removed after the operation
- Supported editable vaults are encrypted again when saved
- OpenPGP operations use an isolated temporary GPG home and do not import keys into the user's default keyring
- Clipboard auto-clear and vault auto-lock are configurable
- SATO does not use cloud services or collect telemetry
- Archive entry paths are validated before extraction to prevent directory traversal
- Existing destination files are not overwritten during archive extraction
- Optional `<archive-name>.bak` backups can be created before supported archive modifications
- Archives handled by external CLI tools are inspected and extracted through temporary directories
- Missing optional external tools disable only the formats or operations that depend on those tools; built-in features remain available

---

## Usage

1. Open file of any [supported format](#supported-formats).

2. For vault files and supported password-protected archives, enter the password when prompted.

3. For crypto containers, use `Tools` → `Unlock Container` or the details pane button.

4. Use the toolbar or right-click context menus to manage entries, groups, files, folders.

5. Select the SATO interface theme from `View` → `Theme`.
 
6. Use `Tools` → `Lock Database` to lock a password vault.
 
7. Commands available from the Command Palette `Ctrl/Cmd + Shift + P`:

  * `SATO: Open Password Vault`
  * `SATO: Lock Vault`
  * `SATO: Reload Vault`

---

## SATO Supported Formats And External Tools

### Supported Formats

| Format        | Description                                                  | `SATO` Base Actions                            |
|---------------|--------------------------------------------------------------|------------------------------------------------|
| `.kdbx`       | KeePass `vault` database                                     | Read, write                                    |
| `.psafe3`     | Password Safe `vault` database                               | Read, write                                    |
| `.ibak`       | Password Safe backup `vault`                                 | Read, write with caution                       |
| `.1pif`       | 1Password Interchange Format `vault` export                  | Read-only (RO)                                 |
| `.bcup`       | Buttercup `vault`                                            | Read-only (RO)                                 |
| `.crt`        | X.509 `certificate`                                          | View and convert PEM/DER files                 |
| `.cer`        | X.509 `certificate` in PEM or DER encoding                   | View and convert PEM/DER files                 |
| `.der`        | DER-encoded X.509 `certificate`                              | View and convert to PEM                        |
| `.pem`        | PEM `certificate`, CSR, public key, or private key (PK)      | View, unlock PKs, and convert X.509 files      |
| `.p8`         | PKCS#8 private `key`                                         | View                                           |
| `.pk8`        | PKCS#8 private `key`                                         | View and unlock                                |
| `.key`        | PEM-encoded private `key`                                    | View and unlock                                |
| `.age`        | Encrypted `file` with encoding and protection type detection | RO inspection; View, change password (Linux)   |
| `.pub`        | Ed25519 RSA, ECDSA, or OpenSSH public `key`                  | View metadata and SHA-256 fingerprint          |
| `.rsa`        | Private or public RSA `key` in PEM or DER encoding           | View metadata and supported PK content         |
| `.ec`         | Private or public EC `key` in PEM or DER encoding            | View, convert, and extract public keys         |
| `.csr`        | Certificate Signing `Request` (`CSR`)                        | View                                           |
| `.p10`        | PKCS#10 `Certificate Signing Request` (`CSR`)                | View                                           |
| `.p12`        | PKCS#12 certificate and PK `container`                       | View, unlock, and show PK                      |
| `.pfx`        | PKCS#12 certificate and PK `container`                       | View, unlock, and show PK                      |
| `.p7b`        | PKCS#7 certificate `chain`                                   | View                                           |
| `.p7c`        | PKCS#7 certificate `chain`                                   | View                                           |
| `.p7s`        | PKCS#7/CMS digital `signature`                               | View                                           |
| `.p7m`        | S/MIME or PKCS#7/ CMS `message`                              | View                                           |
| `.spc`        | PKCS#7/CMS Authenticode `container`                          | View certificates, signatures and CMS details  |
| `.ppk`        | PuTTY private `key`                                          | View, unlock                                   |
| `id_rsa`      | OpenSSH RSA private `key`                                    | View, unlock                                   |
| `id_ecdsa`    | OpenSSH ECDSA private `key`                                  | View, unlock                                   |
| `id_ed25519`  | OpenSSH Ed25519 private `key`                                | View, unlock                                   |
| `.jks`        | Java KeyStore `file`                                         | View, unlock                                   |
| `.jceks`      | Java Cryptography Extension `KeyStore`                       | View, unlock                                   |
| `.gpg`        | Binary OpenPGP `key`, message, or encrypted file             | View packet information and decrypt messages   |
| `.pgp`        | Binary OpenPGP `key`, message, or encrypted file             | View packet information and decrypt messages   |
| `.asc`        | ASCII-armored OpenPGP key, message, or `signature`           | View packet information and decrypt messages   |
| `.sig`        | Detached OpenPGP `signature`                                 | View signature and packet information          |
| `.zip`        | ZIP `archive`                                                | View, edit, extract, delete, manage passwords  |
| `.zipx`       | Extended ZIP `archive`                                       | View, Preview, extract, edit, manage passwords |
| `.7z`         | 7-Zip `archive`                                              | View, Preview, extract, edit, manage passwords |
| `.rar`        | RAR `archive`                                                | View, Preview, unlock, extract                 |
| `.tar`        | TAR `archive`                                                | View, Preview, extract, add, delete content    |
| `.tar.gz`     | Compressed TAR `archive`                                     | View, Preview, extract, add, delete content    |
| `.tgz`        | Compressed TAR `archive`                                     | View, Preview, extract, add, delete content    |
| `.tar.bz2`    | Compressed TAR `archive`                                     | View, Preview, extract, add, delete content    |
| `.tbz2`       | Compressed TAR `archive `                                    | View, Preview, extract, add, delete content    |
| `.tar.xz`     | Compressed TAR `archive`                                     | View, Preview, extract, add, delete content    |
| `.txz`        | Compressed TAR `archive`                                     | View, Preview, extract, add, delete content    |
| `.gz`         | Single-file GZip `archive`                                   | View Info, Preview, extract                    |
| `.bz2`        | Single-file BZip2 `archive`                                  | View Info, Preview, extract                    |
| `.xz`         | Single-file XZ `archive`                                     | View Info, Preview, extract                    |
| `.aia`        | MIT App Inventor `project`                                   | View, Preview, extract                         |
| `.appxbundle` | Microsoft APPX `bundle`                                      | View, Preview, extract                         |
| `.asice`      | Associated Signature `Container` Extended                    | View, Preview, extract                         |
| `.ear`        | Java Enterprise `Archive`                                    | View, Preview, extract                         |
| `.epub`       | EPUB electronic `publication`                                | View, Preview, extract                         |
| `.ipa`        | iOS application `package`                                    | View, Preview, extract                         |
| `.jar`        | Java `Archive`                                               | View, Preview, extract                         |
| `.mcaddon`    | Minecraft `add-on`                                           | View, Preview, extract                         |
| `.mcpack`     | Minecraft resource or behavior `pack`                        | View, Preview, extract                         |
| `.mcproject`  | Minecraft project `file`                                     | View, Preview, extract                         |
| `.mctemplate` | Minecraft world `template`                                   | View, Preview, extract                         |
| `.mcworld`    | Minecraft world `file`                                       | View, Preview, extract                         |
| `.mrpack`     | Modrinth modpack `file`                                      | View, Preview, extract                         |
| `.nupkg`      | NuGet `package`                                              | View, Preview, extract                         |
| `.sb2`        | Scratch 2 project `file`                                     | View, Preview, extract                         |
| `.sb3`        | Scratch 3 project `file`                                     | View, Preview, extract                         |
| `.vsix`       | Visual Studio or VS Code extension `package`                 | View, Preview, extract                         |
| `.war`        | Java Web Application `Archive`                               | View, Preview, extract                         |
| `.whl`        | Python wheel `package`                                       | View, Preview, extract                         |
| `.xlsx`       | Microsoft Excel `workbook`                                   | View, Preview, extract                         |
| `.xpi`        | Mozilla extension `package`                                  | View, Preview, extract                         |
| `.pbix`       | Microsoft Power BI `report`                                  | View, Preview, extract                         |
| `.pbit`       | Microsoft Power BI `template`                                | View, Preview, extract                         |
| `.deb`        | Debian binary `package`                                      | View, Preview, extract                         |
| `.rpm`        | RPM software `package`                                       | View, Preview, extract; Details                |
| `.cab`        | Microsoft Cabinet `archive`                                  | View, Preview, extract                         |
| `.cpio`       | CPIO `archive`                                               | View, Preview, extract                         |
| `.ar`         | Unix AR `archive`                                            | View, Preview, extract                         |
| `.a`          | Unix static `library`                                        | View, Preview, extract                         |
| `.lib`        | Static `library`                                             | View, Preview, extract                         |
| `.luks`       | LUKS1/LUKS2 encrypted `volume`                               | Inspect, lock, unlock, change password         |
| `.zst`        | Single-file Zstandard `archive`                              | View Info, Preview, extract                    |
| `.tar.zst`    | Compressed with Zstandard TAR `archive`                      | View, Preview, extract                         |
| `.tzst`       | Compressed with Zstandard TAR `archive`                      | View, Preview, extract                         |
| `.lzma`       | Single-file LZMA `archive`                                   | View Info, Preview, extract                    |
| `.z`          | Single-file Unix Compress `archive`                          | View Info, Preview, extract                    |
| `.tar.z`      | Compressed with Unix Compress TAR `archive`                  | View, Preview, extract                         |
| `.taz`        | compressed with Unix Compress TAR `archive`                  | View, Preview, extract                         |
| `.lzh`        | LZH `archive`                                                | View, Preview, extract                         |
| `.lha`        | LHA `archive`                                                | View, Preview, extract                         |
| `.arj`        | ARJ `archive`                                                | View, Preview, extract                         |
| `.xar`        | Extensible `Archive` format                                  | View, Preview, extract                         |
| `.<EXT>.bak`  | Created by SATO backup `file`                                | View, open, unlock, Preview, extract (RO mode) |

### Additional Features Provided by Optional External Tools

| External tool | Formats                            | `SATO` Extended Actions                                                              |
|---------------|------------------------------------|--------------------------------------------------------------------------------------|
| `openssl`     | `.csr`, `.p10`, `.p12`             | Parse and display CSR details                                                        |
| `openssl`     | `.p7b`, `.p7c`. `.pfx`             | Unlock containers,Extract and inspect certificate ains                               |
| `openssl`     | `.p7s`, `.p7m`, `.spc`             | Inspect signatures and signer information                                            |
| `puttygen`    | `.ppk`                             | Unlock and inspect PuTTY PK                                                          |
| `ssh-keygen`  | `id_rsa`, `id_ecdsa`, `id_ed25519` | Unlock and inspect OpenSSH PK                                                        |
| `keytool`     | `.jks`, `.jceks`                   | Unlock KeyStores and inspect aliases, owners, issuers, and certificates              |
| `gpg`         | `.gpg`, `.pgp`, `.asc`, `.sig`     | Inspect details, packets, keys and decrypt messages                                  |
| `7z`          | `.tar`, `.tar.bz2`,`.zipx`, `.7z`  | Browse, Preview, extract, add, and delete content                                    |
| `7z`          | `.tgz` `.tbz2`, `.tar.xz`, `.txz`  | Browse, Preview, extract, add, and delete content                                    |
| `7z`          | `.gz`, `.bz2`, `.xz`, `.tar.gz`    | Inspect, Preview, and extract                                                        |
| `7z`          | `.dmg`, `.ar`, `.lib` `.tar.zst`   | Browse, Preview, and extract                                                         |
| `7z`          | `.deb`, `.rpm`, `.cab`, `.cpio`    | Browse, Preview, and extract                                                         |
| `7z`          | `.a`, `.tzst`, `.tar.z`, `.taz`    | Browse, Preview, and extract compressed TAR contents                                 |
| `7z`          | `.zst`, `.lzma`, `.z`,  `.rar`     | Inspect, Preview, and extract                                                        |
| `7z`          | `.lzh`, `.lha`, `.arj`, `.xar`     | Browse, Inspect, Preview, and                                                        |
| `unegg`       | `.alz`, `.egg`                     | Browse, Preview, unlock, and extract regular, solid, split, and Unicode archives     |
| `age`         | `.age`                             | Inspect, decrypt protected files; change passphrase (Linux)                          |
| `cryptsetup`  | `.luks`                            | Inspect LUKS1/LUKS2 headers, verify passwords, and change passwords without mounting |
| `dpkg-deb`    | `.deb`                             | Inspect Debian package metadata when available                                       |
| `rpm`         | `.rpm`                             | Inspect package metadata, requirements, provided capabilities, and signature status  |

> ⚠️ **Important:** Functionality may vary depending on the file variant, the operating system, and the versions of installed external tools.

### External Tools Installation

| OS            | Installation/Commands                                                                      |
|---------------|--------------------------------------------------------------------------------------------|
| Debian/Ubuntu | sudo apt install -y openssl gnupg default-jre-headless putty-tools openssh-client 7zip age cryptsetup util-linux rpm curl ca-certificates<br>Install the `unegg` Linux binary in `/usr/local/bin`     |
| Fedora/RHEL   | sudo dnf install -y openssl gnupg2 java-latest-openjdk-headless putty openssh-clients 7zip age cryptsetup util-linux rpm curl ca-certificates<br>Install the `unegg` Linux binary in `/usr/local/bin` |
| Arch Linux    | sudo pacman -S openssl gnupg jre-openjdk-headless putty openssh 7zip age cryptsetup util-linux rpm-tools curl ca-certificates<br>Install the `unegg` Linux binary in `/usr/local/bin`                       |
| Alpine Linux  | sudo apk add openssl gnupg openjdk17-jre-headless putty openssh-client 7zip age cryptsetup util-linux curl ca-certificates<br>Install the compatible `unegg` Linux binary in `/usr/local/bin`     |
| macOS         | brew install openssl gnupg openjdk putty sevenzip age blurfx/tap/unegg                         |
| Windows       | **Install:**<br>- Gpg4win, OpenSSL for Windows, PuTTY (includes puttygen)<br>- OpenJDK or another Java Runtime<br>- OpenSSH Client Windows optional feature<br>- `7z.exe` (7-Zip CLI)<br>- `unegg.exe` for ALZ/EGG archives<br>- `age.exe`<br>**Ensure:**<br>- openssl, gpg, keytool, 7z and unegg are available in PATH                    |

---

## Features

| Feature                | Details |
|------------------------|---------|
| **Vault management**   | Three-pane viewer for groups, entries, and details<br>Read and write supported vault formats<br>Create, edit, duplicate, and delete entries<br>Create, rename, and delete groups |
| **Crypto file viewer** | Two-pane viewer for crypto files and details and keys<br>Inspect files listed in **Supported Formats**<br>Unlock supported crypto containers and encrypted PK<br>View metadata, fingerprints, hashes, and decrypted content |
| **Сonverter**          | Convert X.509 certificates between PEM and DER formats<br>View source certificate information before conversion<br>Configure the output format and file name<br>Access conversion from the Tools menu or crypto file context menu |
| **Quick actions**      | Show, hide, and copy passwords<br>Copy PK, usernames, URLs, notes, paths and other values<br>Open URLs directly from entry details<br>Show or hide empty values |
| **Search**             | Search vault entries and crypto metadata<br>Search titles, usernames, URLs<br>Search notes, subjects, issuers, paths, and fingerprints |
| **Password generator** | Configurable length and character sets<br>Password strength indicator<br>Entry editor integration and one-click copy<br>Show generated passwords as QR codes |
| **Security controls**  | Lock and reload vaults<br>Lock containers and hide decrypted content<br>Configurable auto-lock and clipboard auto-clear<br>Checks for required external tools |
| **Interface**          | File, Entry, Folder, Tools, View, Settings, and Help menus<br>Status bar with vault, archive, or crypto metadata<br>Selectable VS Code, Dark, Gray, and Light themes<br>Optimized bundled extension package for faster installation and startup |
| **Archive management** | Browse supported archives from the current directory<br>Display archive folders and files as a hierarchical tree<br>Preview supported text files and images without extracting them<br>Extract individual files, folders, or complete archives<br>Add and delete files in ZIP archives<br>Create and delete ZIP folders<br>Set, change, remove, lock, and unlock ZIP passwords<br>Support ZipCrypto and WinZip AES archives<br>Optionally create `.zip.bak` backups before modification |
| **ZIP-based containers** | Browse and extract application packages such as VSIX, JAR, EPUB, XLSX, NuGet, Python wheels, Scratch projects, and Minecraft packages<br>Validate ZIP signatures before opening<br>Protect package integrity through read-only access |
| **QR code generator**    | Generate QR codes from text, URLs, passwords, and other values<br>Paste and clear input<br>Copy QR images and save them as PNG files |

---

## Extension Settings

| Setting                         | Description                                                                                    |
|---------------------------------|------------------------------------------------------------------------------------------------|
| `sato.autoLockTimeout`          | Auto-lock vault after N minutes of inactivity.<br>`0` disables auto-lock                       |
| `sato.clipboardClearTimeout`    | Clear clipboard N seconds after copying a secret.<br>`0` disables clipboard auto-clear         |
| `sato.passwordGeneratorLength`  | Default password length used by the generator                                                  |
| `sato.confirmBeforeDelete`      | Ask for confirmation before deleting entries or folders                                        |
| `sato.showPasswordsByDefault`   | Reveal passwords automatically in the entry details pane                                       |
| `sato.showEmptyValuesByDefault` | Show empty values by default in vault and crypto file details                                  |
| `sato.showStatusBar`            | Show or hide vault statistics, archive statistics, or cryptographic metadata                   |
| `sato.theme`                    | SATO interface theme: `vscode`, `dark`, `gray`, or `light`.<br>Default: `vscode`               |
| `sato.createArchiveBackups`     | Create a `.zip.bak` backup before modifying a ZIP archive.<br>Default: `false`                 |
| `sato.fileCategoryFilters`      | File categories displayed in the first column: `all`, `vaults`, `archives`, `ssh`, or `crypto` |

---

## Development

Open folder `.devcontainer` in VSCode and use commands:

| Action                    | Command                                                                   |
|---------------------------|---------------------------------------------------------------------------|
| Install dependencies      | `npm install`                                                             |
| Build the project         | `npm run build:extension-bundle:production`                               |
| Package `.vsix` extension | `npm run package`                                                         |
| List packaged files       | `npx @vscode/vsce ls --tree`                                              |
| Install generated VSIX    | `code --install-extension files/sato-vscode-ext-<version>.vsix --force`   |
| Install in VSCodium       | `codium --install-extension files/sato-vscode-ext-<version>.vsix --force` |

---

## Links

[[git: sato-vscode](https://github.com/Marcus-Aprelius/sato-vscode)]
[[git: sato](https://github.com/Marcus-Aprelius/sato)]
[[Teams (Skype)](marcus.aprelius.antoninus@gmail.com)]
[[MIT](LICENSE)]
 
[[Open VSX Registry](https://open-vsx.org/extension/MarcusApreliusAntoninus/sato-vscode-ext)]
[[VSCode Markeplace](https://marketplace.visualstudio.com/items?itemName=MarcusApreliusAntoninus.sato-vscode-ext)]

[[DEV.to](https://dev.to/marcusaprelius)]
[[Medium.com](https://medium.com/@marcus.aprelius.antoninus)]

---

© 2026 [Marcus-Aprelius](https://github.com/Marcus-Aprelius)
