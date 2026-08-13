import * as vscode from "vscode";
import type { GroupView, VaultStats } from "../vault";
import { STYLES } from "./styles";
import { CLIENT_SCRIPT } from "./clientScript";

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
        content="
            default-src 'none';
            img-src ${webview.cspSource} https:;
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
            script-src 'nonce-${n}';
        ">
    <title>SATO Vault</title>
    <style nonce="${n}">
        body {
            font-family: var(--vscode-font-family);
            padding: 16px;
            color: var(--vscode-errorForeground);
        }
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
        content="
            default-src 'none';
            img-src ${webview.cspSource} data: https:;
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
            script-src 'nonce-${n}';
        ">
    <title>SATO - ${escapeHtml(name)}</title>
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
    <button id="unlock">Unlock DB</button>

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
    settings: Settings,
    logoUri: vscode.Uri,
    codiconsCssUri: vscode.Uri,
    appVersion = "0.0.0",
    gitCommit = ""
): string {
    const n = nonce();
    const name = uri.path.split("/").pop() ?? "vault.kdbx";
    const logoSrc = webview.asWebviewUri(logoUri).toString();
    const codiconsCssSrc = webview.asWebviewUri(codiconsCssUri).toString();
    const initialState = safeScriptJson(JSON.stringify({tree: root, stats, settings}));
    const versionLabel = gitCommit ? `${appVersion} [${gitCommit}]` : appVersion;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
        content="
            default-src 'none';
            img-src ${webview.cspSource} data: https:;
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
            script-src 'nonce-${n}';
        ">
    <title>SATO - ${escapeHtml(name)}</title>
    <link rel="stylesheet" href="${codiconsCssSrc}">
    <style nonce="${n}">${STYLES}</style>
</head>
<body>
    <div class="app">
        <header class="toolbar">
            <div class="brand">${escapeHtml(name)}</div>

            <button class="btn" id="btn-database" title="Database">Database ▾</button>

            <button class="btn primary" id="btn-add" title="Add entry or folder">+ Add ▾</button>

            <button class="btn" id="btn-generate" title="Generate Password">Generate Password</button>

            <button class="btn" id="btn-lock" title="Lock database">
                <span class="codicon codicon-lock" aria-hidden="true"></span>
                <span>Lock DB</span>
            </button>

            <button class="btn" id="btn-settings" title="Settings">
                <span class="codicon codicon-settings-gear" aria-hidden="true"></span>
            <span>Settings</span>
            </button>

            <div class="search-box">
                    <span class="codicon codicon-search search-icon" aria-hidden="true"></span>
                    <input id="search" type="search" placeholder="Search title, username, URL, notes..." />
                </div>
        </header>

        <main class="layout" id="layout">
            <section class="pane groups-pane">
                <div class="pane-title">Groups</div>
                <div class="tree" id="tree"></div>
            </section>

            <div class="col-resizer" id="resize-groups" data-resize="groups"></div>
 
            <section class="pane entries-pane">
                <div class="pane-title" id="entries-title">Entries</div>
                <div class="entry-list" id="entry-list"></div>
            </section>

            <div class="col-resizer" id="resize-entries" data-resize="entries"></div>

            <section class="pane details-pane">
                <div class="pane-title">Details</div>
                <div class="details" id="details">
                    <div class="empty">Select an entry to view its fields.</div>
                </div>
            </section>
        </main>

        <footer class="statusbar" id="statusbar"></footer>
    </div>

    <div class="ctx-menu" id="ctx-menu" role="menu"></div>

    <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal" id="unlock-modal" style="width:360px;">
            <div class="modal-title">Unlock Database</div>

            <div class="modal-body">
            <label>
                Master password

                <div class="unlock-password-field">
                    <input type="password" id="unlock-password" />
                    <span id="unlock-layout" class="keyboard-layout-indicator">ENG</span>
                </div>
            </label>

            <div class="empty" id="unlock-error" style="display:none;"></div>
            </div>

            <div class="modal-footer unlock-modal-footer">
                <div id="unlock-capslock-warning" class="capslock-warning" style="display:none;">
                    Caps Lock is ON
                </div>

                <div class="unlock-modal-actions">
                    <button type="button" class="btn" id="unlock-cancel">Cancel</button>
                    <button type="button" class="btn primary" id="unlock-ok">OK</button>
                </div>
            </div>
        </div>
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
        <div
            class="modal"
            id="about-modal"
            style="width:380px;"
        >
            <div class="modal-title">About SATO</div>

            <div
                class="modal-body"
                style="align-items:center; text-align:center; gap:8px; padding:16px;"
            >
            <img class="about-logo" src="${logoSrc}" alt="SATO logo" />
                Secure Access Task Operator

                <div>VS Code extention for KeePass KDBX DB integration</div>

                <div style="margin-top:12px;">
                    See 
                    <a
                        href="https://github.com/Marcus-Aprelius/sato"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="color: var(--vscode-textLink-foreground); text-decoration: none;"
                    >
                        sato Linux command line tool >>>
                    </a>
                </div>
                <div class="about-spacer"></div>
                <div>Version: ${escapeHtml(versionLabel)}</div>
                <div class="about-spacer"></div>
                <div style="margin-top:12px;">
                    © 2026
                    <a
                        href="https://github.com/Marcus-Aprelius/sato-vscode"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="color: var(--vscode-textLink-foreground); text-decoration: none;"
                    >
                        Marcus-Aprelius
                    </a>
                </div>
            </div>

            <div class="modal-footer">
                <button
                    type="button"
                    class="btn primary"
                    id="about-close"
                >
                    Close
                </button>
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

function nonce(): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < 32; i++) {
        s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return s;
}

function safeScriptJson(value: string): string {
    return value
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
