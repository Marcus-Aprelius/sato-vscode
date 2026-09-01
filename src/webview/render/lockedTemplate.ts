import { escapeHtml, nonce } from "./htmlUtils";

import type * as vscode from "vscode";

export function renderLocked(
    webview: vscode.Webview,
    uri: vscode.Uri
): string {
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
