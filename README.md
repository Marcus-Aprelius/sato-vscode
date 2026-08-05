<img src="assets/sato.png" alt="sato">

# SATO - Secure Access Task Operator for VS Code

Open, edit and manage KeePass `.kdbx` (KDBX 3 (AES-KDF)) vaults directly inside VS Code (v>`1.100.0`).

> **Status:** first release. Full CRUD support for KDBX 3 vaults with a master password. Argon2 (KDBX 4) is not yet supported.

---

## Features

- **Vault viewer** — three-pane layout: groups tree, entry list, entry details.
- **Entries** — create, edit, duplicate and delete. Show / copy Password, Username, URL, Notes and custom fields.
- **Folders** — create, rename and delete nested groups from the toolbar or the context menu.
- **Password generator** — configurable length and character classes, strength indicator, one-click copy and integration with the entry editor.
- **Global search** — filter by title, username, URL or notes.
- **Statistics bar** — groups, entries, duplicates, weak and expired passwords, empty folders.
- **Auto-save** — every change is written back to the `.kdbx` file immediately.
- **Local-first** — nothing leaves the extension host; no cloud, no telemetry.

---

## Usage

1. Open any `.kdbx` file — the SATO Vault Viewer opens automatically.
2. Enter the master password (up to 3 attempts).
3. Use the toolbar or right-click to manage groups and entries.

Commands (Ctrl/Cmd+Shift+P):

- `SATO: Open KeePass Vault`
- `SATO: Lock Vault`
- `SATO: Reload Vault`

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
* produce sato-vscode-<version>.vsix
    ```
    npm run package     
    ```

Press **F5** to launch an Extension Development Host.

---

## Security

- The master password is only held in memory while the editor tab is open.
- The `.kdbx` file is re-encrypted with the same credentials on every save.
- Report vulnerabilities via GitHub issues on the [repository](https://github.com/Marcus-Aprelius/sato-vscode).

---

## License

MIT — see [LICENSE](LICENSE).

---

© 2026 [Marcus-Aprelius](https://github.com/Marcus-Aprelius/sato-vscode)

Discord: Marcus.Aprelius.Antoninus
