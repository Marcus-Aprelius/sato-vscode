import * as vscode from "vscode";
import type { GroupView, VaultStats } from "./vault";

export interface Settings {
    autoLockTimeout: number;
    clipboardClearTimeout: number;
    passwordGeneratorLength: number;
    confirmBeforeDelete: boolean;
    showPasswordsByDefault: boolean;
    showStatusBar: boolean;
}

export function renderError(webview: vscode.Webview, message: string): string {
    const n = nonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline';">
    <title>SATO Vault</title>
    <style nonce="${n}">
        body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-errorForeground); }
    </style>
</head>
<body>
    <h2>Cannot open vault</h2>
    <p>${escapeHtml(message)}</p>
</body>
</html>`;
}

export function renderLocked(webview: vscode.Webview, uri: vscode.Uri): string {
    const n = nonce();
    const name = uri.path.split("/").pop() ?? "vault.kdbx";
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${n}';">
    <title>SATO – ${escapeHtml(name)}</title>
    <style nonce="${n}">
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 32px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            cursor: pointer;
            font: inherit;
        }
        button:hover { background: var(--vscode-button-hoverBackground); }
        .muted { color: var(--vscode-descriptionForeground); }
    </style>
</head>
<body>
    <h2>🔒 ${escapeHtml(name)}</h2>
    <p class="muted">Vault is locked.</p>
    <button id="unlock">Unlock</button>
    <script nonce="${n}">
        const vscode = acquireVsCodeApi();
        document.getElementById('unlock').addEventListener('click', () => {
            vscode.postMessage({ type: 'unlock' });
        });
    </script>
</body>
</html>`;
}

export function renderVault(
    webview: vscode.Webview,
    uri: vscode.Uri,
    root: GroupView,
    stats: VaultStats,
    settings: Settings
): string {
    const n = nonce();
    const name = uri.path.split("/").pop() ?? "vault.kdbx";
    const initialState = JSON.stringify({ tree: root, stats, settings });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${n}';">
    <title>SATO – ${escapeHtml(name)}</title>
    <style nonce="${n}">${STYLES}</style>
</head>
<body>
    <div class="app">
        <header class="toolbar">
            <div class="brand">${escapeHtml(name)}</div>
            <button class="btn" id="btn-database" title="Database">Database ▾</button>
            <button class="btn primary" id="btn-add" title="Add entry or folder">+ Add ▾</button>
            <button class="btn" id="btn-generate">Generate Password</button>
            <button class="btn" id="btn-refresh" title="Reload vault from disk">Refresh</button>
            <button class="btn" id="btn-settings" title="Settings">⚙ Settings</button>
            <input id="search" type="search" placeholder="Search title, username, URL, notes…" />
        </header>

        <main class="layout">
            <section class="pane groups-pane">
                <div class="pane-title">Groups</div>
                <div class="tree" id="tree"></div>
            </section>
            <section class="pane entries-pane">
                <div class="pane-title" id="entries-title">Entries</div>
                <div class="entry-list" id="entry-list"></div>
            </section>
            <section class="pane details-pane">
                <div class="pane-title">Details</div>
                <div class="details" id="details"><div class="empty">Select an entry to view its fields.</div></div>
            </section>
        </main>

        <footer class="statusbar" id="statusbar"></footer>
    </div>

    <div class="ctx-menu" id="ctx-menu" role="menu"></div>

    <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal" id="entry-modal">
            <div class="modal-title" id="entry-modal-title">New Entry</div>
            <div class="modal-body">
                <label>Title <input type="text" id="ef-title" /></label>
                <label>Username <input type="text" id="ef-username" /></label>
                <label>Password
                    <div class="row">
                        <input type="password" id="ef-password" />
                        <button type="button" class="btn" id="ef-toggle">Show</button>
                        <button type="button" class="btn" id="ef-generate">Generate</button>
                    </div>
                    <div class="strength" id="ef-strength"><div class="strength-bar" id="ef-strength-bar"></div><span id="ef-strength-label"></span></div>
                </label>
                <label>URL <input type="text" id="ef-url" /></label>
                <label>Notes <textarea id="ef-notes" rows="4"></textarea></label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" id="ef-cancel">Cancel</button>
                <button type="button" class="btn primary" id="ef-save">Save</button>
            </div>
        </div>

        <div class="modal" id="gen-modal">
            <div class="modal-title">Generate Password</div>
            <div class="modal-body">
                <label>Length: <span id="gen-length-val">20</span>
                    <input type="range" id="gen-length" min="4" max="64" value="20" />
                </label>
                <label class="checkbox"><input type="checkbox" id="gen-upper" checked> Uppercase (A-Z)</label>
                <label class="checkbox"><input type="checkbox" id="gen-lower" checked> Lowercase (a-z)</label>
                <label class="checkbox"><input type="checkbox" id="gen-digits" checked> Numbers (0-9)</label>
                <label class="checkbox"><input type="checkbox" id="gen-symbols" checked> Special characters</label>
                <label>Generated password
                    <div class="row">
                        <input type="text" id="gen-output" readonly />
                        <button type="button" class="btn" id="gen-regen" title="Regenerate">↻</button>
                    </div>
                    <div class="strength"><div class="strength-bar" id="gen-strength-bar"></div><span id="gen-strength-label"></span></div>
                </label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" id="gen-close">Close</button>
                <button type="button" class="btn primary" id="gen-copy">Copy</button>
            </div>
        </div>

        <div class="modal" id="settings-modal">
            <div class="modal-title">Settings</div>
            <div class="modal-body">
                <label>Auto-lock timeout (minutes, 0 = disabled)
                    <input type="number" id="s-autolock" min="0" max="240" step="1" />
                </label>
                <label>Clipboard clear timeout (seconds, 0 = disabled)
                    <input type="number" id="s-clipclear" min="0" max="600" step="5" />
                </label>
                <label>Password generator length
                    <input type="number" id="s-genlen" min="4" max="128" step="1" />
                </label>
                <label class="checkbox"><input type="checkbox" id="s-confirmdel"> Confirm before delete</label>
                <label class="checkbox"><input type="checkbox" id="s-showpw"> Show passwords by default</label>
                <label class="checkbox"><input type="checkbox" id="s-showstatusbar"> Show status bar</label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" id="s-cancel">Cancel</button>
                <button type="button" class="btn primary" id="s-save">Save</button>
            </div>
        </div>

        <div class="modal" id="dbinfo-modal">
            <div class="modal-title">Database Info</div>
            <div class="modal-body" id="dbinfo-body">
                <div class="empty">Loading…</div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn primary" id="dbinfo-close">Close</button>
            </div>
        </div>
    </div>

    <script nonce="${n}">
        const initialState = ${initialState};
        ${CLIENT_SCRIPT}
    </script>
</body>
</html>`;
}

const STYLES = `
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    font-size: var(--vscode-font-size, 13px);
}
.app { display: grid; grid-template-rows: auto 1fr auto; height: 100vh; }
.toolbar {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
}
.brand { font-weight: 600; margin-right: 8px; }
.toolbar input[type=search] {
    flex: 1;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 4px 8px;
    font: inherit;
    min-width: 120px;
}
.btn {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 4px 10px;
    cursor: pointer;
    font: inherit;
    border-radius: 2px;
    white-space: nowrap;
}
.btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
.btn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
.btn.primary:hover { background: var(--vscode-button-hoverBackground); }
.btn.danger { background: var(--vscode-errorForeground); color: var(--vscode-editor-background); }

.layout {
    display: grid;
    grid-template-columns: 240px 300px 1fr;
    overflow: hidden;
}
.pane {
    display: flex; flex-direction: column;
    border-right: 1px solid var(--vscode-panel-border);
    overflow: hidden;
    min-width: 0;
}
.pane:last-child { border-right: none; }
.pane-title {
    padding: 6px 10px;
    font-size: 0.85em;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBarSectionHeader-background, transparent);
}

.tree, .entry-list, .details {
    padding: 6px;
    overflow: auto;
    flex: 1;
}
.tree ul { list-style: none; margin: 0; padding-left: 14px; }
.tree > ul { padding-left: 0; }
.group-node {
    display: flex; align-items: center; gap: 4px;
    padding: 3px 6px;
    cursor: pointer;
    border-radius: 2px;
    user-select: none;
}
.group-node:hover { background: var(--vscode-list-hoverBackground); }
.group-node.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
.group-caret { width: 12px; display: inline-block; text-align: center; opacity: 0.6; }
.group-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-count { color: var(--vscode-descriptionForeground); font-size: 0.85em; }

.entry-row {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 6px;
    cursor: pointer;
    border-radius: 2px;
    user-select: none;
}
.entry-row:hover { background: var(--vscode-list-hoverBackground); }
.entry-row.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
.entry-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entry-sub { color: var(--vscode-descriptionForeground); font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { font-size: 0.75em; padding: 1px 5px; border-radius: 8px; }
.badge.expired { background: var(--vscode-errorForeground); color: var(--vscode-editor-background); }
.badge.weak { background: var(--vscode-editorWarning-foreground, #d19a66); color: var(--vscode-editor-background); }

.details h2 { font-size: 1rem; margin: 4px 0 12px 0; }
.details table { width: 100%; border-collapse: collapse; }
.details td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid var(--vscode-panel-border); }
.details td.label { color: var(--vscode-descriptionForeground); width: 110px; }
.details .value { display: flex; gap: 6px; align-items: center; word-break: break-all; min-width: 0; }
.details .value input, .details .value span { flex: 1; min-width: 0; }
.details .value input {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 3px 6px;
    font: inherit;
}
.details .actions { display: flex; gap: 6px; margin-top: 12px; }

.empty { color: var(--vscode-descriptionForeground); padding: 12px; }

.statusbar {
    display: flex; gap: 14px;
    padding: 4px 10px;
    border-top: 1px solid var(--vscode-panel-border);
    background: var(--vscode-statusBar-background, var(--vscode-editor-background));
    color: var(--vscode-statusBar-foreground, var(--vscode-foreground));
    font-size: 0.85em;
}
.statusbar .item { display: inline-flex; gap: 4px; }
.statusbar .item strong { font-weight: 600; }
.statusbar .warn { color: var(--vscode-editorWarning-foreground, #d19a66); }
.statusbar .err { color: var(--vscode-errorForeground); }

.ctx-menu {
    position: fixed;
    display: none;
    background: var(--vscode-menu-background, var(--vscode-editor-background));
    color: var(--vscode-menu-foreground, var(--vscode-foreground));
    border: 1px solid var(--vscode-menu-border, var(--vscode-panel-border));
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    padding: 4px 0;
    min-width: 180px;
    z-index: 1000;
    border-radius: 3px;
}
.ctx-menu.open { display: block; }
.ctx-item {
    padding: 4px 14px;
    cursor: pointer;
    user-select: none;
}
.ctx-item:hover { background: var(--vscode-menu-selectionBackground, var(--vscode-list-activeSelectionBackground)); color: var(--vscode-menu-selectionForeground, var(--vscode-list-activeSelectionForeground)); }
.ctx-sep { height: 1px; background: var(--vscode-menu-separatorBackground, var(--vscode-panel-border)); margin: 4px 0; }

.modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 900;
    align-items: center;
    justify-content: center;
}
.modal-backdrop.open { display: flex; }
.modal {
    display: none;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    width: min(480px, 92vw);
    max-height: 90vh;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
}
.modal.open { display: flex; }
.modal-title {
    padding: 10px 14px;
    font-weight: 600;
    border-bottom: 1px solid var(--vscode-panel-border);
}
.modal-body {
    padding: 12px 14px;
    display: flex; flex-direction: column; gap: 10px;
    overflow-y: auto;
}
.modal-body label { display: flex; flex-direction: column; gap: 4px; font-size: 0.9em; color: var(--vscode-descriptionForeground); }
.modal-body label.checkbox { flex-direction: row; align-items: center; color: var(--vscode-foreground); }
.modal-body input[type=text], .modal-body input[type=password], .modal-body textarea {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 5px 8px;
    font: inherit;
}
.modal-body .row { display: flex; gap: 6px; }
.modal-body .row input[type=text], .modal-body .row input[type=password] { flex: 1; }
.modal-footer {
    padding: 10px 14px;
    display: flex; justify-content: flex-end; gap: 8px;
    border-top: 1px solid var(--vscode-panel-border);
}

.strength { display: flex; align-items: center; gap: 6px; height: 14px; }
.strength-bar {
    height: 4px; flex: 1; background: var(--vscode-input-border, #444); border-radius: 2px; overflow: hidden;
    position: relative;
}
.strength-bar::after {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
    width: var(--pct, 0%); background: var(--color, #888);
    transition: width 0.15s ease;
}
.strength span { font-size: 0.8em; color: var(--vscode-descriptionForeground); min-width: 60px; }

.dbinfo-table { width: 100%; border-collapse: collapse; }
.dbinfo-table td { padding: 4px 8px; vertical-align: top; border-bottom: 1px solid var(--vscode-panel-border); word-break: break-all; }
.dbinfo-table td.label { color: var(--vscode-descriptionForeground); width: 130px; }
`;

const CLIENT_SCRIPT = `
const vscode = acquireVsCodeApi();
let state = initialState;
let selectedGroupId = state.tree.id;
let selectedEntryId = null;
let searchQuery = '';
let settings = state.settings;

const groupIndex = new Map();
const entryIndex = new Map();
const parentGroupOf = new Map();

function reindex() {
    groupIndex.clear();
    entryIndex.clear();
    parentGroupOf.clear();
    const walk = (g) => {
        groupIndex.set(g.id, g);
        for (const e of g.entries) {
            entryIndex.set(e.id, e);
            parentGroupOf.set(e.id, g.id);
        }
        for (const c of g.groups) {
            parentGroupOf.set(c.id, g.id);
            walk(c);
        }
    };
    walk(state.tree);
}

function setState(newState) {
    state = newState;
    if (newState.settings) settings = newState.settings;
    reindex();
    if (!groupIndex.has(selectedGroupId)) {
        selectedGroupId = state.tree.id;
    }
    if (selectedEntryId && !entryIndex.has(selectedEntryId)) {
        selectedEntryId = null;
    }
    renderAll();
}

// ---- rendering ----

function renderAll() {
    renderTree();
    renderEntries();
    renderDetails();
    renderStatus();
}

function renderTree() {
    const treeEl = document.getElementById('tree');
    treeEl.innerHTML = '';
    treeEl.appendChild(renderGroupNode(state.tree, 0));
}

function renderGroupNode(g, depth) {
    const wrap = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'group-node' + (g.id === selectedGroupId ? ' active' : '');
    row.style.paddingLeft = (6 + depth * 10) + 'px';
    row.dataset.groupId = g.id;

    const caret = document.createElement('span');
    caret.className = 'group-caret';
    caret.textContent = g.groups.length ? '▸' : '';
    row.appendChild(caret);

    const label = document.createElement('span');
    label.className = 'group-label';
    label.textContent = g.name;
    row.appendChild(label);

    const count = document.createElement('span');
    count.className = 'group-count';
    count.textContent = g.entries.length ? String(g.entries.length) : '';
    row.appendChild(count);

    row.addEventListener('click', (e) => {
        e.stopPropagation();
        selectGroup(g.id);
    });
    row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        selectGroup(g.id);
        openGroupMenu(e.clientX, e.clientY, g.id);
    });

    wrap.appendChild(row);
    if (g.groups.length) {
        const ul = document.createElement('ul');
        for (const child of g.groups) {
            const li = document.createElement('li');
            li.appendChild(renderGroupNode(child, depth + 1));
            ul.appendChild(li);
        }
        wrap.appendChild(ul);
    }
    return wrap;
}

function selectGroup(id) {
    selectedGroupId = id;
    selectedEntryId = null;
    renderAll();
}

function entryMatches(entry) {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (entry.title + ' ' + entry.username + ' ' + entry.url + ' ' + entry.notes).toLowerCase().indexOf(q) !== -1;
}

function collectMatchingEntries(g, out) {
    for (const e of g.entries) if (entryMatches(e)) out.push(e);
    for (const c of g.groups) collectMatchingEntries(c, out);
}

function renderEntries() {
    const list = document.getElementById('entry-list');
    const titleEl = document.getElementById('entries-title');
    list.innerHTML = '';

    let entries = [];
    if (searchQuery) {
        collectMatchingEntries(state.tree, entries);
        titleEl.textContent = 'Search results (' + entries.length + ')';
    } else {
        const g = groupIndex.get(selectedGroupId);
        entries = g ? g.entries.slice() : [];
        titleEl.textContent = (g ? g.name : 'Entries') + ' (' + entries.length + ')';
    }

    if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = searchQuery ? 'No entries match.' : 'No entries in this group.';
        list.appendChild(empty);
        return;
    }

    for (const entry of entries) {
        const row = document.createElement('div');
        row.className = 'entry-row' + (entry.id === selectedEntryId ? ' active' : '');
        row.dataset.entryId = entry.id;

        const info = document.createElement('div');
        info.style.flex = '1';
        info.style.minWidth = '0';
        const title = document.createElement('div');
        title.className = 'entry-title';
        title.textContent = entry.title;
        const sub = document.createElement('div');
        sub.className = 'entry-sub';
        sub.textContent = entry.username || entry.url || '';
        info.appendChild(title);
        info.appendChild(sub);
        row.appendChild(info);

        if (entry.expired) {
            const b = document.createElement('span'); b.className = 'badge expired'; b.textContent = 'expired'; row.appendChild(b);
        }
        if (entry.weak) {
            const b = document.createElement('span'); b.className = 'badge weak'; b.textContent = 'weak'; row.appendChild(b);
        }

        row.addEventListener('click', () => selectEntry(entry.id));
        row.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            selectEntry(entry.id);
            openEntryMenu(e.clientX, e.clientY, entry.id);
        });
        list.appendChild(row);
    }
}

function selectEntry(id) {
    selectedEntryId = id;
    renderEntries();
    renderDetails();
}

const STANDARD = ['UserName', 'URL', 'Password', 'Notes'];

function renderDetails() {
    const container = document.getElementById('details');
    container.innerHTML = '';
    if (!selectedEntryId) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'Select an entry to view its fields.';
        container.appendChild(empty);
        return;
    }
    const entry = entryIndex.get(selectedEntryId);
    if (!entry) return;

    const h2 = document.createElement('h2');
    h2.textContent = entry.title;
    container.appendChild(h2);

    const table = document.createElement('table');
    const fields = ['UserName', 'URL', 'Password', 'Notes', ...entry.fields.filter(f => !['Title','UserName','URL','Password','Notes'].includes(f))];
    for (const field of fields) {
        const tr = document.createElement('tr');
        const tdLabel = document.createElement('td'); tdLabel.className = 'label'; tdLabel.textContent = field;
        const tdValue = document.createElement('td');
        const value = document.createElement('div'); value.className = 'value';

        if (field === 'Password') {
            const input = document.createElement('input');
            input.type = 'password';
            input.value = entry.hasPassword ? '••••••••' : '';
            input.readOnly = true;
            input.dataset.field = field;
            input.dataset.entryId = entry.id;
            value.appendChild(input);
            const reveal = document.createElement('button');
            reveal.className = 'btn';
            reveal.textContent = 'Show';
            reveal.addEventListener('click', () => {
                if (input.type === 'password') {
                    vscode.postMessage({ type: 'revealSecret', entryId: entry.id, field });
                } else {
                    input.type = 'password';
                    input.value = entry.hasPassword ? '••••••••' : '';
                    reveal.textContent = 'Show';
                }
            });
            value.appendChild(reveal);
            if (settings && settings.showPasswordsByDefault && entry.hasPassword) {
                vscode.postMessage({ type: 'revealSecret', entryId: entry.id, field });
            }
        } else {
            const text = field === 'UserName' ? entry.username
                : field === 'URL' ? entry.url
                : field === 'Notes' ? entry.notes
                : '';
            const span = document.createElement('span');
            span.textContent = text || '(empty)';
            value.appendChild(span);
        }
        const copy = document.createElement('button');
        copy.className = 'btn';
        copy.textContent = 'Copy';
        copy.addEventListener('click', () => vscode.postMessage({ type: 'copySecret', entryId: entry.id, field }));
        value.appendChild(copy);

        tdValue.appendChild(value);
        tr.appendChild(tdLabel); tr.appendChild(tdValue);
        table.appendChild(tr);
    }
    container.appendChild(table);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const editBtn = document.createElement('button'); editBtn.className = 'btn primary'; editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openEntryModal(entry.id));
    actions.appendChild(editBtn);
    const dupBtn = document.createElement('button'); dupBtn.className = 'btn'; dupBtn.textContent = 'Duplicate';
    dupBtn.addEventListener('click', () => vscode.postMessage({ type: 'duplicateEntry', entryId: entry.id }));
    actions.appendChild(dupBtn);
    const delBtn = document.createElement('button'); delBtn.className = 'btn danger'; delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => vscode.postMessage({ type: 'deleteEntry', entryId: entry.id }));
    actions.appendChild(delBtn);
    container.appendChild(actions);
}

function renderStatus() {
    const bar = document.getElementById('statusbar');
    const s = state.stats;
    bar.innerHTML = '';
    const item = (label, value, cls) => {
        const el = document.createElement('span');
        el.className = 'item' + (cls ? ' ' + cls : '');
        el.innerHTML = label + ': <strong>' + value + '</strong>';
        bar.appendChild(el);
    };
    item('Groups', s.groups);
    item('Entries', s.entries);
    item('Duplicates', s.duplicates, s.duplicates > 0 ? 'warn' : '');
    item('Weak', s.weak, s.weak > 0 ? 'warn' : '');
    item('Expired', s.expired, s.expired > 0 ? 'err' : '');
    item('Empty groups', s.emptyGroups);
    applyStatusBarVisibility();
}

function applyStatusBarVisibility() {
    const bar = document.getElementById('statusbar');
    if (settings && settings.showStatusBar === false) {
        bar.style.display = 'none';
    } else {
        bar.style.display = '';
    }
}

// ---- context menu ----

const ctxMenu = document.getElementById('ctx-menu');
function closeMenu() { ctxMenu.classList.remove('open'); ctxMenu.innerHTML = ''; }
document.addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closeModal(); } });

function showMenu(x, y, items) {
    ctxMenu.innerHTML = '';
    for (const it of items) {
        if (it.sep) {
            const s = document.createElement('div'); s.className = 'ctx-sep'; ctxMenu.appendChild(s); continue;
        }
        const el = document.createElement('div');
        el.className = 'ctx-item';
        el.textContent = it.label;
        el.addEventListener('click', (ev) => { ev.stopPropagation(); closeMenu(); it.action(); });
        ctxMenu.appendChild(el);
    }
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.classList.add('open');
    // clamp within viewport
    const rect = ctxMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 4) + 'px';
    if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 4) + 'px';
}

function openEntryMenu(x, y, entryId) {
    showMenu(x, y, [
        { label: 'Copy Username', action: () => vscode.postMessage({ type: 'copySecret', entryId, field: 'UserName' }) },
        { label: 'Copy Password', action: () => vscode.postMessage({ type: 'copySecret', entryId, field: 'Password' }) },
        { label: 'Copy URL', action: () => vscode.postMessage({ type: 'copySecret', entryId, field: 'URL' }) },
        { sep: true },
        { label: 'Edit Entry', action: () => openEntryModal(entryId) },
        { label: 'Duplicate Entry', action: () => vscode.postMessage({ type: 'duplicateEntry', entryId }) },
        { label: 'Delete Entry', action: () => vscode.postMessage({ type: 'deleteEntry', entryId }) }
    ]);
}

function openGroupMenu(x, y, groupId) {
    showMenu(x, y, [
        { label: 'New Entry', action: () => openEntryModal(null, groupId) },
        { label: 'New Folder', action: () => vscode.postMessage({ type: 'createGroup', parentId: groupId }) },
        { sep: true },
        { label: 'Rename', action: () => vscode.postMessage({ type: 'renameGroup', groupId }) },
        { label: 'Delete', action: () => vscode.postMessage({ type: 'deleteGroup', groupId }) }
    ]);
}

// ---- modals ----

const backdrop = document.getElementById('modal-backdrop');
function openModal(id) {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
    document.getElementById(id).classList.add('open');
    backdrop.classList.add('open');
}
function closeModal() {
    backdrop.classList.remove('open');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
    editingEntryId = null;
    editingGroupId = null;
}
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

// Entry modal
let editingEntryId = null;
let editingGroupId = null;

function openEntryModal(entryId, groupId) {
    editingEntryId = entryId || null;
    editingGroupId = groupId || selectedGroupId;
    document.getElementById('entry-modal-title').textContent = entryId ? 'Edit Entry' : 'New Entry';
    document.getElementById('ef-title').value = '';
    document.getElementById('ef-username').value = '';
    document.getElementById('ef-password').value = '';
    document.getElementById('ef-password').type = 'password';
    document.getElementById('ef-toggle').textContent = 'Show';
    document.getElementById('ef-url').value = '';
    document.getElementById('ef-notes').value = '';
    updateEntryStrength();
    openModal('entry-modal');
    if (entryId) {
        vscode.postMessage({ type: 'getEntryDetail', entryId });
    } else {
        document.getElementById('ef-title').focus();
    }
}

function fillEntryModal(detail) {
    document.getElementById('ef-title').value = detail.title;
    document.getElementById('ef-username').value = detail.username;
    document.getElementById('ef-password').value = detail.password;
    document.getElementById('ef-url').value = detail.url;
    document.getElementById('ef-notes').value = detail.notes;
    updateEntryStrength();
    document.getElementById('ef-title').focus();
}

document.getElementById('ef-cancel').addEventListener('click', closeModal);
document.getElementById('ef-toggle').addEventListener('click', () => {
    const p = document.getElementById('ef-password');
    const t = document.getElementById('ef-toggle');
    if (p.type === 'password') { p.type = 'text'; t.textContent = 'Hide'; }
    else { p.type = 'password'; t.textContent = 'Show'; }
});
document.getElementById('ef-password').addEventListener('input', updateEntryStrength);
document.getElementById('ef-generate').addEventListener('click', () => {
    const pw = generateWithDefaults();
    document.getElementById('ef-password').value = pw;
    updateEntryStrength();
});
document.getElementById('ef-save').addEventListener('click', () => {
    const fields = {
        title: document.getElementById('ef-title').value.trim(),
        username: document.getElementById('ef-username').value,
        password: document.getElementById('ef-password').value,
        url: document.getElementById('ef-url').value,
        notes: document.getElementById('ef-notes').value
    };
    if (!fields.title) {
        document.getElementById('ef-title').focus();
        return;
    }
    if (editingEntryId) {
        vscode.postMessage({ type: 'updateEntry', entryId: editingEntryId, fields });
    } else {
        vscode.postMessage({ type: 'createEntry', groupId: editingGroupId, fields });
    }
    closeModal();
});

// Password strength
function strengthOf(pw) {
    if (!pw) return { pct: 0, color: '#666', label: 'empty' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (pw.length >= 16) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
        { pct: 15, color: '#d16969', label: 'very weak' },
        { pct: 30, color: '#d19a66', label: 'weak' },
        { pct: 50, color: '#d1c66a', label: 'fair' },
        { pct: 70, color: '#a3d16a', label: 'good' },
        { pct: 85, color: '#6ad189', label: 'strong' },
        { pct: 100, color: '#4ec9b0', label: 'very strong' }
    ];
    const idx = Math.min(score, levels.length - 1);
    return levels[idx];
}

function updateEntryStrength() {
    const pw = document.getElementById('ef-password').value;
    const bar = document.getElementById('ef-strength-bar');
    const label = document.getElementById('ef-strength-label');
    const s = strengthOf(pw);
    bar.style.setProperty('--pct', s.pct + '%');
    bar.style.setProperty('--color', s.color);
    label.textContent = s.label;
}

// Generator modal
function currentGenOptions() {
    return {
        length: parseInt(document.getElementById('gen-length').value, 10),
        upper: document.getElementById('gen-upper').checked,
        lower: document.getElementById('gen-lower').checked,
        digits: document.getElementById('gen-digits').checked,
        symbols: document.getElementById('gen-symbols').checked
    };
}

function generatePassword(opts) {
    let alphabet = '';
    if (opts.upper) alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (opts.lower) alphabet += 'abcdefghijklmnopqrstuvwxyz';
    if (opts.digits) alphabet += '0123456789';
    if (opts.symbols) alphabet += '!@#$%^&*()-_=+[]{};:,.<>?/|~';
    if (!alphabet) alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const len = Math.max(1, Math.min(128, opts.length | 0));
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    let out = '';
    for (let i = 0; i < len; i++) out += alphabet.charAt(buf[i] % alphabet.length);
    return out;
}

function generateWithDefaults() {
    const len = (settings && settings.passwordGeneratorLength) || 20;
    return generatePassword({ length: len, upper: true, lower: true, digits: true, symbols: true });
}

function regenGen() {
    const pw = generatePassword(currentGenOptions());
    document.getElementById('gen-output').value = pw;
    const s = strengthOf(pw);
    const bar = document.getElementById('gen-strength-bar');
    bar.style.setProperty('--pct', s.pct + '%');
    bar.style.setProperty('--color', s.color);
    document.getElementById('gen-strength-label').textContent = s.label;
}

document.getElementById('gen-length').addEventListener('input', () => {
    document.getElementById('gen-length-val').textContent = document.getElementById('gen-length').value;
    regenGen();
});
document.querySelectorAll('#gen-upper, #gen-lower, #gen-digits, #gen-symbols').forEach(el => el.addEventListener('change', regenGen));
document.getElementById('gen-regen').addEventListener('click', regenGen);
document.getElementById('gen-close').addEventListener('click', closeModal);
document.getElementById('gen-copy').addEventListener('click', () => {
    const pw = document.getElementById('gen-output').value;
    if (pw) vscode.postMessage({ type: 'copyText', text: pw });
});

document.getElementById('btn-generate').addEventListener('click', () => {
    const len = (settings && settings.passwordGeneratorLength) || 20;
    document.getElementById('gen-length').value = String(len);
    document.getElementById('gen-length-val').textContent = String(len);
    openModal('gen-modal');
    regenGen();
});

// ---- settings modal ----
function openSettingsModal() {
    document.getElementById('s-autolock').value = String(settings.autoLockTimeout || 0);
    document.getElementById('s-clipclear').value = String(settings.clipboardClearTimeout || 0);
    document.getElementById('s-genlen').value = String(settings.passwordGeneratorLength || 20);
    document.getElementById('s-confirmdel').checked = !!settings.confirmBeforeDelete;
    document.getElementById('s-showpw').checked = !!settings.showPasswordsByDefault;
    document.getElementById('s-showstatusbar').checked = settings.showStatusBar !== false;
    openModal('settings-modal');
}

document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
document.getElementById('s-cancel').addEventListener('click', closeModal);
document.getElementById('s-save').addEventListener('click', () => {
    const next = {
        autoLockTimeout: Math.max(0, Math.min(240, parseInt(document.getElementById('s-autolock').value, 10) || 0)),
        clipboardClearTimeout: Math.max(0, Math.min(600, parseInt(document.getElementById('s-clipclear').value, 10) || 0)),
        passwordGeneratorLength: Math.max(4, Math.min(128, parseInt(document.getElementById('s-genlen').value, 10) || 20)),
        confirmBeforeDelete: document.getElementById('s-confirmdel').checked,
        showPasswordsByDefault: document.getElementById('s-showpw').checked,
        showStatusBar: document.getElementById('s-showstatusbar').checked
    };
    vscode.postMessage({ type: 'updateSettings', settings: next });
    closeModal();
});

// ---- toolbar ----
function openDropdown(button, items) {
    const r = button.getBoundingClientRect();
    showMenu(r.left, r.bottom + 2, items);
}

document.getElementById('btn-add').addEventListener('click', (e) => {
    e.stopPropagation();
    openDropdown(e.currentTarget, [
        { label: 'Entry', action: () => openEntryModal(null, selectedGroupId) },
        { label: 'Folder', action: () => vscode.postMessage({ type: 'createGroup', parentId: selectedGroupId }) }
    ]);
});
document.getElementById('btn-database').addEventListener('click', (e) => {
    e.stopPropagation();
    openDropdown(e.currentTarget, [
        { label: 'Show Info', action: () => {
            document.getElementById('dbinfo-body').innerHTML = '<div class="empty">Loading…</div>';
            openModal('dbinfo-modal');
            vscode.postMessage({ type: 'getDbInfo' });
        } }
    ]);
});
document.getElementById('dbinfo-close').addEventListener('click', closeModal);

document.getElementById('btn-refresh').addEventListener('click', () => vscode.postMessage({ type: 'reload' }));
document.getElementById('search').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderEntries();
});

function renderDbInfo(info) {
    const body = document.getElementById('dbinfo-body');
    body.innerHTML = '';
    const rows = [
        ['Name', info.name || '(unnamed)'],
        ['Description', info.desc || '(empty)'],
        ['KDBX version', info.version],
        ['Generator', info.generator || 'unknown'],
        ['File', info.filePath],
        ['File size', info.fileSize + ' bytes'],
        ['Groups', String(info.groupCount)],
        ['Entries', String(info.entryCount)],
        ['Recycle bin', info.recycleBinEnabled ? 'enabled' : 'disabled']
    ];
    const table = document.createElement('table');
    table.className = 'dbinfo-table';
    for (const [k, v] of rows) {
        const tr = document.createElement('tr');
        const tdK = document.createElement('td'); tdK.className = 'label'; tdK.textContent = k;
        const tdV = document.createElement('td'); tdV.textContent = v;
        tr.appendChild(tdK); tr.appendChild(tdV);
        table.appendChild(tr);
    }
    body.appendChild(table);
}

// ---- inbound messages ----
window.addEventListener('message', (ev) => {
    const msg = ev.data;
    if (msg.type === 'vaultState') {
        setState(msg.state);
    } else if (msg.type === 'settingsUpdated') {
        settings = msg.settings;
        applyStatusBarVisibility();
        if (selectedEntryId) renderDetails();
    } else if (msg.type === 'secretRevealed') {
        const input = document.querySelector('input[data-entry-id="' + msg.entryId + '"][data-field="' + msg.field + '"]');
        if (input) {
            input.type = 'text';
            input.value = msg.value;
            const container = input.parentElement;
            const reveal = container ? container.querySelector('.btn') : null;
            if (reveal) reveal.textContent = 'Hide';
        }
    } else if (msg.type === 'entryDetail') {
        fillEntryModal(msg.detail);
    } else if (msg.type === 'dbInfo') {
        renderDbInfo(msg.info);
    }
});

reindex();
renderAll();
`;

function nonce(): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < 32; i++) {
        s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return s;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
