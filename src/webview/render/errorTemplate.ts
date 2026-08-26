import { escapeHtml, nonce } from "./htmlUtils";

import type * as vscode from "vscode";

export function renderError(
    webview: vscode.Webview,
    message: string
): string {
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
