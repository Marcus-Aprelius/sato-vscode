# Change Log

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
