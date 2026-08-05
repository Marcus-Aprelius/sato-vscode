```text
   _____      _______ ____
  / ____|  /\|__   __| __ \    Secure
 | (___   /  \  | | | |  | |    Access
  \___ \ / /\ \ | | | |  | |     Task
  ____) | ____ \| | | |__| |      Operator
 |_____/_/    \_\_|  \____/    > for VS Code
```

# Overview
This is a first release that add fully all functionality.

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

## Requirements

- VS Code `1.100.0` or newer.
- A KDBX 3 (AES-KDF) vault. KDBX 4 (Argon2) is on the roadmap.
