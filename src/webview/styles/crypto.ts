export const CRYPTO_STYLES = `
.crypto-toggle-empty-btn {width: 170px; min-width: 170px; text-align: center;}
.crypto-container-lock-btn {width: 150px; min-width: 150px; text-align: center;}

.crypto-container-lock-btn.btn.primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
}

.crypto-container-lock-btn.btn.primary:hover {
    background: var(--vscode-button-hoverBackground);
}

.crypto-container-lock-btn.btn.danger {
    background: var(--vscode-errorForeground);
    color: var(--vscode-editor-background);
}

.crypto-container-lock-btn.btn.danger:hover {
    background: var(--vscode-editorError-foreground, var(--vscode-errorForeground));
    color: var(--vscode-editor-background);
}

.crypto-toggle-empty-btn:disabled {
    border: 1px solid var(--vscode-panel-border);
    opacity: 0.65;
    background: transparent;
    color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground));
}

.crypto-toggle-empty-btn:disabled:hover {
    border: 1px solid var(--vscode-panel-border);
    background: transparent;
    color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground));
    cursor: default;
}

.private-key-actions {display: flex; justify-content: flex-end; height: 16px; margin: 0;}
.private-key-content {margin: -8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-all;}
.private-key-actions .icon-btn {margin-left: auto; flex: 0 0 auto;}
.private-key-content {margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-all;}

`;
