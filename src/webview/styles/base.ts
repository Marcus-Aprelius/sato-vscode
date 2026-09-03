export const BASE_STYLES = `
* { box-sizing: border-box; }

html,
body {
    height: 100%;
    margin: 0;
}

body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    font-size: var(--vscode-font-size, 13px);
}

.app {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100vh;
}

.btn {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 3px 6px;
    min-width: 72px;
    cursor: pointer;
    font: inherit;
    border-radius: 2px;
    white-space: nowrap;
}

.btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
}

.btn.primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
}

.btn.primary:hover {
    background: var(--vscode-button-hoverBackground);
}

.btn.danger {
    background: var(--vscode-errorForeground);
    color: var(--vscode-editor-background);
}

.btn:disabled,
.btn:disabled:hover,
.btn:disabled:active,
.toolbar button:disabled,
.toolbar button:disabled:hover,
.toolbar button:disabled:active {
    opacity: 0.45;
    cursor: default;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground));
}

.btn.danger:disabled,
.btn.danger:disabled:hover,
.btn.danger:disabled:active {
    opacity: 0.45;
    cursor: default;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground));
}

.btn.primary:disabled,
.btn.primary:disabled:hover,
.btn.primary:disabled:active {
    opacity: 0.45;
    cursor: default;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground));
}

.icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 22px;
    padding: 0;
    margin-left: auto;
    background: transparent;
    color: var(--vscode-icon-foreground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
}

.icon-btn:hover {
    background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground)
    );
}

.icon-btn .codicon {
    font-size: 20px;
}

.empty {
    color: var(--vscode-descriptionForeground);
    padding: 12px;
}
`;
