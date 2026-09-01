export const CRYPTO_STYLES = `
.crypto-toggle-empty-btn {
    width: 170px;
    min-width: 170px;
    text-align: center;
}

.crypto-toggle-pk-btn {
    width: 132px;
    min-width: 132px;
    text-align: center;
}

.crypto-container-lock-btn {
    width: 150px;
    min-width: 150px;
    text-align: center;
}

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
    background: var(
        --vscode-editorError-foreground,
        var(--vscode-errorForeground)
    );
    color: var(--vscode-editor-background);
}

.crypto-toggle-empty-btn:disabled {
    border: 1px solid var(--vscode-panel-border);
    opacity: 0.65;
    background: transparent;
    color: var(
        --vscode-disabledForeground,
        var(--vscode-descriptionForeground)
    );
}

.crypto-toggle-empty-btn:disabled:hover {
    border: 1px solid var(--vscode-panel-border);
    background: transparent;
    color: var(
        --vscode-disabledForeground,
        var(--vscode-descriptionForeground)
    );
    cursor: default;
}

.private-key-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 16px;
}

.private-key-header h3 {
    margin: 0;
}

.private-key-header .icon-btn {
    margin-left: 8px;
    flex: 0 0 auto;
}
`;
