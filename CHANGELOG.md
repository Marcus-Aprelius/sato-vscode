# Change Log

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
  * **Vault viewer** — three-pane layout: groups tree, entry list, entry details.
  * **Entries** — create, edit, duplicate and delete. Show / copy Password, Username, URL, Notes and custom fields.
  * **Folders** — create, rename and delete nested groups from the toolbar or the context menu.
  * **Password generator** — configurable length and character classes, strength indicator, one-click copy and integration with the entry editor.
  * **Global search** — filter by title, username, URL or notes.
  * **Statistics bar** — groups, entries, duplicates, weak and expired passwords, empty folders.
  * **Auto-save** — every change is written back to the `.kdbx` file immediately.
  * **Local-first** — nothing leaves the extension host; no cloud, no telemetry.
