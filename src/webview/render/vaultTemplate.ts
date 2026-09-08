import { STYLES } from "../styles";
import { renderModals } from "./modalsTemplate";

import type * as vscode from "vscode";
import type { Settings } from "./types";
import type { GroupView, VaultStats } from "../../vault";

import {
    escapeHtml,
    nonce,
    safeScriptJson
} from "./htmlUtils";

export function renderVault(
    webview: vscode.Webview,
    uri: vscode.Uri,
    root: GroupView,
    stats: VaultStats,
    settings: Settings,
    logoUri: vscode.Uri,
    toolbarLogoUri: vscode.Uri,
    codiconsCssUri: vscode.Uri,
    webviewClientUri: vscode.Uri,
    appVersion = "0.0.0",
    gitCommit = "",
    selectedEntryId: string | null = null,
    readOnlyVault = false,
    vaultFormat = ""
): string {
    const value = nonce();
    const name = uri.path.split("/").pop() ?? "vault.kdbx";
    const logoSrc = webview.asWebviewUri(logoUri).toString();
    const toolbarLogoSrc = webview.asWebviewUri(toolbarLogoUri).toString();
    const codiconsCssSrc = webview.asWebviewUri(codiconsCssUri).toString();
    const webviewClientSrc = webview.asWebviewUri(webviewClientUri).toString();
    const initialState = safeScriptJson(JSON.stringify({tree: root, stats, settings, selectedEntryId, readOnlyVault, vaultFormat}));
    const versionLabel = gitCommit ? `${appVersion} [${gitCommit}]` : appVersion;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        http-equiv="Content-Security-Policy"
        content="
            default-src 'none';
            img-src ${webview.cspSource} data: https:;
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
            script-src 'nonce-${value}';">

    <title>SATO - ${escapeHtml(name)}</title>
    <link rel="stylesheet" href="${codiconsCssSrc}">

    <style nonce="${value}">${STYLES}</style>
</head>

<body>
    <div class="app">
        <header class="toolbar">
            <img class="toolbar-logo" src="${toolbarLogoSrc}" alt="SATO" title="SATO by Marcus Aprelius"/>

            <button class="btn" id="btn-file" title="File">File ▾</button>
            <button class="btn" id="btn-entry" title="Entry">Entry ▾</button>
            <button class="btn" id="btn-folder" title="Folder">Folder ▾</button>
            <button class="btn" id="btn-tools" title="Tools">Tools ▾</button>
            <button class="btn" id="btn-view" title="View">View ▾</button>
            <button class="btn" id="btn-settings" title="Settings">
                <span class="codicon codicon-settings-gear" aria-hidden="true"></span>
                <span>Settings</span>
            </button>

            <button class="btn" id="btn-help" title="Help">Help ▾</button>

            <div class="search-box">
                <span class="codicon codicon-search search-icon" aria-hidden="true"></span>
                <input id="search" type="search" placeholder="Search title, username, URL, notes..."/>
            </div>
        </header>

        <main class="layout" id="layout">
            <section class="pane groups-pane">
                <div class="pane-title" id="groups-title">Groups</div>
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

    ${renderModals(logoSrc, versionLabel)}

    <script nonce="${value}">window.initialState = ${initialState};</script>
    <script nonce="${value}" src="${webviewClientSrc}"></script>
</body>
</html>`;
}
