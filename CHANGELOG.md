# 0.4.0

## Added

* Added fast filtering by category: All, Vaults, Archives, SSH, and Crypto Files
* Added a QR code generator with:
  * Live generation from text, URLs, passwords, and other data
  * Clipboard input, image copying, and PNG export
  * **Show QR** integration with the Password Generator and Base64 converter
* Added archive browsing, Preview, extraction, and supported editing through `7z`:
  * `.zipx`, `.7z`, `.rar`,  `.tar`, `.tar.gz`, `.tgz`, `.tar.bz2`
  * `.tbz2`, `.tar.xz`, `.txz`, `.gz`, `.bz2`, `.xz`
* Added read-only browsing, Preview, and extraction for:
  * `.cab`, `.cpio`, `.ar`, `.a`, `.lib`,  `.zst`, `.lzma`, `.z`, `.dmg`
  * `.tar.zst`, `.tzst`, `.tar.z`, `.taz`, `.lzh`, `.lha`, `.arj`, `.xar`
* Added specialized Linux package support:
  * `.deb` with separate `Control` and `Payload` trees
  * `.rpm` with a `Payload` tree and optional package Details through `rpm`
* Added read-only support for additional ZIP-based containers:
  * `.aia`, `.appxbundle`, `.asice`, `.ear`, `.epub`, `.ipa`, `.jar`
  * `.mcaddon`, `.mcpack`, `.mcproject`, `.mctemplate`, `.mcworld`, `.mrpack`
  * `.nupkg`, `.pbix`, `.pbit`, `.sb2`, `.sb3`, `.vsix`, `.war`, `.whl`, `.xlsx`, `.xpi`
* Added read-only `.alz` and `.egg` support through `unegg`:
  * Browse, Preview, unlock, and extraction
  * Password-protected, solid, split, and Unicode archives
* Added password management for supported containers and keys:
  * `.7z`, `.zipx`,  `.p12`, `.pfx`, `.jks`, `.jceks`
  * `.age` files - decryption and read-only decrypted-content Preview
  * `.luks` containers - inspection, password verification, and password changes through `cryptsetup`
* Added automatic backup support using `<file-name>.bak` (always read-only)
* Added conditional **Preview** and **Show Info** actions to archive context menus
* Added dependency notifications for missing 7-Zip, `unegg`, `age`, `cryptsetup`, OpenSSL, GPG, `keytool`, PuTTYgen, and OpenSSH tools
* Added ZIP signature validation, Zip Slip protection, extraction limits, and ZIP-bomb detection
* Added safe temporary extraction and validation for archives processed through external CLI tools
* Added result verification and rollback for supported password-change operations
* Isolated OpenPGP operations in temporary GPG home directories
* Sanitized sensitive LUKS header details displayed in the interface

## Changed

* Refactored archive handling, extraction, navigation, context menus, password dialogs, and security utilities
* Added specialized inspection, Preview, and extraction pipelines for DEB, RPM, compound TAR, and single-file compressed formats
* Improved Archive Explorer with:
  * Horizontal scrolling
  * Compact and consistent tree indentation
  * Better handling of long file paths
* Improved extraction from nested TAR, DEB, RPM, and CPIO payloads
* Improved Preview for extensionless text files and unsupported binary files
* Improved read-only menus to show only supported actions
* Improved archive, package, and static-library format labels
* Improved RPM Details formatting and conditional availability
* Improved startup, filtering, and file-switching performance
* Improved password-state detection for PKCS#12, OpenPGP, Java KeyStore, age, and LUKS containers
* Password Generator now clears previous results whenever it opens
* Updated the development container and external tooling
* Updated `README.md`
* Improved relative date tooltips, such as `3 days ago`
* Updated dependencies and resolved all reported npm security vulnerabilities
* Updated the minimum supported VS Code version to `1.120.0`
* Removed the unused direct `node-fetch` dependency
* Bundled the Extension Host with `esbuild`
* Reduced the VSIX package from approximately 6 MB and 1,400 files to less than 1 MB and approximately 15 files
* `Delete Folder` now removes the selected directory and its contents without deleting identically named directories elsewhere in archives edited through 7-Zip, including compound TAR archives
* ZIP edits preserve the archive and backup permissions, ownership and timestamps
* Removed diagnostic logging of file information from the Webview console
* Standard OpenSSH public-key filenames are inspected as public keys instead of private keys
* PuTTY Ed25519 keys can be unlocked when PuTTYgen exports them in OpenSSH format
* PKCS#12 password changes retain the rollback copy and report its path if restoration fails; cleanup failures no longer hide the original error

---

# 0.3.2

## Changed:
  * `README.md` file updated
  * Code refactoring
  * Refactored shared utilities and removed duplicated code
  * Improved archive tree navigation and archive status information

## Added:
  * Added selectable SATO interface themes:
    * VS Code Theme
    * Dark
    * Gray
    * Light
  * Added the `View → Theme` submenu
  * Added persistent theme selection through the `sato.theme` setting
  * Added theme selection and live preview to `Settings → General`
  * Added ZIP archive support:
    * Browse archive folders and files
    * View file metadata, compression method, sizes, ratio, CRC-32, and encryption status
    * Extract individual files, folders, or the complete archive
    * Add and delete files
    * Create and delete folders
    * Open password-protected ZIP archives
    * Change or remove archive passwords
    * Lock an unlocked archive and clear its password from memory
    * Create optional `.zip.bak` backups before modifying archives
  * Added the `sato.createArchiveBackups` setting

---

# 0.3.1

## Changed:
  * Extended the Converter with a dedicated `Base64` tab
  * Added resizable Converter window with responsive input and output fields
  * Code refactoring 
## Added:
  * `Base64` tab to Converter
  * Added Live Mode for automatic encoding and decoding

---

# 0.3.0

## Changed:
  * Improved PEM and DER key detection with more accurate key type, encoding, and format information
  * Removed the irrelevant `PEM block` field from DER certificate signing request details
  * Extended `.der` content detection for X.509 certificates, certificate signing requests, RSA and EC keys, PKCS#7 certificate chains, and CMS messages
  * The converter no longer offers the source file's current format as an output option
  * Added separate `Convert` and `Extract` modes to the crypto file converter
  * Updated the converter to save files directly to the selected destination without opening an additional save dialog
  * Hidden empty converter source fields such as `Subject`, `Issuer`, and `Valid to`
  * Improved the Crypto Converter layout, field alignment, and terminology
  * Added consistent tab styling across the Converter, Settings, About, Info, Details, and Private Key views
  * Added SATO icons to the Converter, Settings, and About modal headers
  * Improved private key detection summaries and navigation
  * Improved long field label layout in the Info view
  * Refactored crypto file conversion and extraction availability checks
  * Updated packages:
    * `vscode/vsce`
    * `types/node`
  * Updated `README.md`

## Added:
  * Articles on [DEV.to](https://dev.to/marcusaprelius) and 
[Medium.com](https://medium.com/@marcus.aprelius.antoninus)
  * Added support for `.spc` PKCS#7/CMS and Authenticode certificate containers
  * Added extraction options for `.spc` files:
    * Certificates as PEM
    * Certificates as DER
    * Certificate chain as P7B
  * Added support for `.ec` files
  * Added conversion of EC private keys to:
    * SEC1 PEM and DER
    * PKCS#8 PEM and DER
    * SPKI public key PEM and DER
  * Added support for `.rsa` files
  * Added conversion of RSA private keys to:
    * PKCS#1 PEM and DER
    * PKCS#8 PEM and DER
    * SPKI public key PEM and DER
    * PKCS#1 public key PEM and DER
  * Added an `Extract...` action to the crypto file context menu when extraction is available
  * Added a `Show Info` action to the crypto file context menu
  * Added Copy buttons to Crypto Converter source fields
  * Added Copy buttons to all File Info values
  * Added clickable private key detection links that open the Private Key tab
  * Added tooltips for key size, file size, and certificate validity dates
  * Added `Show/Hide Empty Values` support to the Details tab
  * Added detection of empty and absent values in parsed crypto details

## Fixed:
  * Prevented stale output file names when no conversion formats are available
  * Removed the separator below the last File Info row
  * Improved handling of empty output format lists in the crypto file converter

## Known Issues:
  * `npm audit` reports a vulnerability in the transitive `@xmldom/xmldom` dependency used by `kdbxweb`. A compatible upstream update is required. Using `npm audit fix --force` is not recommended because it installs a breaking version of `kdbxweb`.

---

# 0.2.0

## Changed:
  * Updated `README.md`
  * Simplified the Crypto Files view from three columns to two by removing the redundant entry list
  * `Settings` button update
  * Updated the Tools converter to support selecting a source file directly from the conversion dialog
  * code refactoring and small improvements
## Added:
  * Added support for OpenSSH RSA, ECDSA, and Ed25519 public key files with the `.pub` extension
  * Added an X.509 certificate converter with PEM-to-DER and DER-to-PEM support
  * Added a conversion dialog showing source certificate information and configurable output options

---

# 0.1.5

## Changed:
  * Improved internal code structure
  * Updated `README.md`
  * Fixed private key unlocking for `.pem`, `.key`, and related files
  * Simplified the `About` window
  * Replaced the `Show Private Key` and `Hide Private Key` buttons with a `Private Key` tab
  * Moved extended inspection output to a separate `Details` tab
  * Improved the formatting of values in the `Details` tab
## Added:
  * automatic password field clearing when reopening unlock dialogs
  * private key extraction from unlocked PKCS#12/PFX containers
  * tooltips showing elapsed or remaining days for the `Valid from` and `Valid to` fields
  * converted-size tooltips for the `File size`, `Container size`, and `Key size` fields
  * the `Supported Formats` window
  * the `Show empty values by default` setting for vault and crypto file details
  * separately copyable fields in the `Details` tab

---

# 0.1.4

## Changed:
  * `README.md` updated
  * code refactored without changing functionality
  * code improvement:
    * duplication removed
    * removed possibility of displaying the private key of another entry
    * ASC file encryption has been fixed

## Added:
  * Added read-only `.age` encrypted file inspection
  * Added a File menu command (`Open with Default Editor`) to reopen the current file with the default VS Code editor

---

# 0.1.3

## Changed:
  * Updated `README.md` with the latest supported formats
  * Updated the About dialog with the latest supported formats
  * Refactored `KdbxEditorProvider.ts` into smaller editor modules
  * Renamed Primary Key actions to Private Key
  * file `devcontainer.json`

## Added:
  * Read-only `.p7b` and `.p7c` PKCS#7 certificate chain inspection
  * Read-only `.p7s` PKCS#7 digital signature inspection
  * Read-only `.p7m` CMS/S/MIME message inspection
  * Added `.p10` PKCS#10 certificate signing request inspection in PEM and DER formats
  * `.p8` PKCS#8 private key inspection
  * Password-protected `.pk8` PKCS#8 private key unlocking
  * `.ppk` PuTTY private key inspection and password-protected unlocking with `puttygen`
  * Support for viewing and unlocking OpenSSH private keys named `id_rsa`, `id_ecdsa`, and `id_ed25519`

---

# 0.1.2

## Changed:
  * code rafactored
  * `README.md` file
  * `.vscodeignore` file

## Added:
  * Read-only `.1pif` vault viewer
  * Read-only `.bcup` Buttercup vault viewer
  * `.jceks` Java Cryptography Extension KeyStore support
  * `.crt`, `.cer` and `.der` files support

---

# 0.1.1

## Changed:
  * `README.md` updated
  * Crypto file menus and dialogs improved
  * External dependency handling improved
  * Vulnerable `@xmldom/xmldom` dependency updated to `0.8.14`

## Added:
  * `.pgp`, `.gpg`, `.asc`, `.sig` file viewer
  * OpenPGP public and private key inspection
  * OpenPGP encrypted message decryption
  * Private key selection for OpenPGP decryption
  * `Decrypt Message` and `Hide Decrypted Content` actions
  * Automatic OpenPGP private key detection
  * Checks for missing `OpenSSL`, `GPG` and `keytool`
  * Clear installation notifications for missing external tools

---

# 0.1.0

## Changed:
  * Code refactored
  * `About` window updated
  * Main toolbar and menus redesigned
  * `Show Info` moved to `File` menu
  * `Reload from Disk` moved to `File` menu
  * `Lock Database` and `Unlock Database` moved to `Tools` menu
  * `Copy` buttons replaced with icon buttons
  * Search improved for crypto file fields
  * Empty values UX improved

## Added:
  * `.crt`, `.csr`, `.key`, `.pem` file viewer
  * `.p12`, `.pfx`, `.jks` container viewer
  * Password unlock for `.p12`, `.pfx`, `.jks`
  * `Lock Container` and `Unlock Container`
  * `Show Primary Key` and `Hide Primary Key`
  * `Show Empty Values` and `Hide Empty Values`
  * Empty values counter on buttons
  * Crypto file `File Info`
  * `Check Update` in `Help` menu
  * Toolbar SATO icon

---

# 0.0.5
## Changed:
  * code refactored
  * documentation updated
  * `.gitignore` and `.vscodeignore` files
  * context menu behaviour

## Added:
  * Button `Go` - to open external link in URL field
  * `.psafe3` files support
    * `.ibak` files (backup of `.psafe3`) support
  * Menu items for `.psafe3`/`.ibak` files:
    * `Create entry`
    * `Update entry`
    * `Duplicate entry`
    * `Delete entry`

---

# 0.0.4

## Changed:
  * file `devcontainer.json` updated (extention `onlyutkarsh.vsix-viewer`)
  * file `webview.ts` refactored
  * READMEs files updated
  * password prompt window

## Added:
  * button `Open DB` added 
  * buttons `Lock DB`/`Unlock DB`
  * columns resizing

---

## 0.0.3

* changed:
  * Main menu:
    * `Refresh` button moved into `Database`
    * `About SATO` button added to the `Database`
    * `About SATO` page refactored
  * READMEs files
  * `devcontainer.json`
  * renamed:
    * **name**: `sato-vscode` => `sato-vscode-ext`
    * **displayName**: `SATO` => `SATO Secrets`
  * file `.vscodeignore` adjusted
  * icons switched to codicons

* added:
  * `copy` button at the database info page 
---

## 0.0.2

* Added:
  * KDBX 4 (Argon2) support 

---

## 0.0.1

* Initial release

* Added basic functionality:
  * **Vault viewer** — three-pane layout: groups tree, entry list, entry details
  * **Entries** — create, edit, duplicate and delete. Show / copy Password, Username, URL, Notes and custom fields
  * **Folders** — create, rename and delete nested groups from the toolbar or the context menu
  * **Password generator** — configurable length and character classes, strength indicator, one-click copy and integration with the entry editor
  * **Global search** — filter by title, username, URL or notes
  * **Statistics bar** — groups, entries, duplicates, weak and expired passwords, empty folders
  * **Auto-save** — every change is written back to the `.kdbx` file immediately
  * **Local-first** — nothing leaves the extension host; no cloud, no telemetry
