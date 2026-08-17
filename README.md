<img src="assets/sato.png" alt="sato">

# SATO - Secure Access Task Operator for VS Code

Open, browse, edit and manage KeePass `.kdbx` vaults and Password Safe `.psafe3` / `.ibak` vaults directly inside VS Code `v1.100.0+`.

> **Status:** In development. Use in production environments at your own risk.

---

<img src="assets/sato-vscode2.gif" alt="sato-vscode">

---

## Security

- The master password is only held in memory while the editor tab is open.
- KeePass `.kdbx` files are re-encrypted with the same credentials on every save.
- Password Safe `.psafe3` and `.ibak` files are saved using the Password Safe file format.
- Clipboard auto-clear can be configured in extension settings.
- Auto-lock can be configured in extension settings.
- Nothing leaves the extension host. No cloud services, no telemetry.
- Report vulnerabilities via GitHub issues on the [repository](https://github.com/Marcus-Aprelius/sato-vscode).

---

## Supported Vault Formats

| Format | Status |
|---|---|
| `.kdbx` | Read and write |
| `.psafe3` | Read and write |
| `.ibak` | Read and write backup file |

> `.ibak` files are Password Safe intermediate backup files. They can be opened with the same master password as the original `.psafe3` database.

---

## Features

- **Vault viewer**
  - Three-pane layout: groups tree, entry list, entry details.
  - Works directly inside VS Code custom editor.

- **KeePass KDBX support**
  - Open KDBX 3 and KDBX 4 vaults.
  - Create, edit, duplicate and delete entries.
  - Create, rename and delete groups.
  - Save changes back to the `.kdbx` file.

- **Password Safe support**
  - Open `.psafe3` databases.
  - Open `.ibak` intermediate backup files.
  - Create, edit, duplicate and delete entries.
  - Create, rename and delete groups.
  - Save changes back to the Password Safe file.

- **Entry actions**
  - Show and hide password.
  - Copy username.
  - Copy password.
  - Copy URL.
  - Copy notes.
  - Open URL with the **Go** button.

- **Context menus**
  - Right-click groups for folder actions.
  - Right-click entries for entry actions.
  - Context menus are available across the groups and entries panes.

- **Password generator**
  - Configurable password length.
  - Uppercase, lowercase, digits and symbols.
  - Strength indicator.
  - One-click copy.
  - Integration with the entry editor.

- **Search**
  - Search by title, username, URL and notes.

- **Statistics bar**
  - Groups.
  - Entries.
  - Duplicate passwords.
  - Weak passwords.
  - Expired passwords.
  - Empty groups.

- **Session controls**
  - Lock vault.
  - Reload vault.
  - Auto-lock after inactivity.
  - Clipboard auto-clear after copying secrets.

---

## Notes and Limitations

- Password Safe notes are currently displayed, but writing notes back to `.psafe3` is limited by the current `password-safe` npm package API.
- Empty Password Safe folders may be shown during the current session. To persist a new folder reliably, create an entry inside that folder.
- `.ibak` files are backup files. Editing them is technically supported, but it is recommended to save or restore them intentionally.

---

## Usage

1. Open any supported vault file:
   - `.kdbx`
   - `.psafe3`
   - `.ibak`

2. Enter the master password.

3. Use the toolbar or right-click context menus to manage groups and entries.

4. Use **Lock DB** to lock the vault when finished.

Commands from Command Palette `Ctrl/Cmd + Shift + P`:

- `SATO: Open Password Vault`
- `SATO: Lock Vault`
- `SATO: Reload Vault`

---

## Extension Settings

SATO contributes the following settings:

- `sato.autoLockTimeout`
  - Auto-lock vault after N minutes of inactivity.
  - `0` disables auto-lock.

- `sato.clipboardClearTimeout`
  - Clear clipboard N seconds after copying a secret.
  - `0` disables clipboard auto-clear.

- `sato.passwordGeneratorLength`
  - Default password length used by the generator.

- `sato.confirmBeforeDelete`
  - Ask for confirmation before deleting entries or folders.

- `sato.showPasswordsByDefault`
  - Reveal passwords automatically in the entry details pane.

- `sato.showStatusBar`
  - Show or hide the vault statistics bar.

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
* build file sato-vscode-<version>.vsix
  ```bash
  npm run package
  ```

---

## Repository
**VS Code extension**: https://github.com/Marcus-Aprelius/sato-vscode
**SATO command line tool**: https://github.com/Marcus-Aprelius/sato
---

[MIT LICENSE](LICENSE)

---

© 2026 [Marcus-Aprelius](https://github.com/Marcus-Aprelius/sato-vscode)

Discord: Marcus.Aprelius.Antoninus
