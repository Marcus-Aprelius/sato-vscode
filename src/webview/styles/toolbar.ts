export const TOOLBAR_STYLES = `
.toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
}

.brand {font-weight: 600; margin-right: 8px;}

.toolbar-logo {
    width: 18px;
    height: 18px;
    object-fit: contain;
    flex: 0 0 auto;
    margin-right: 4px;
    border-radius: 3px;
}

.toolbar button:disabled {opacity: 0.5; cursor: default;}

#btn-file,
#btn-entry,
#btn-folder,
#btn-tools,
#btn-view,
#btn-help {min-width: 60px; text-align: center;}

#btn-settings .codicon {font-size: 12px; line-height: 1; transform: translateY(1px);}

.toolbar .search-box {
    position: relative;
    display: flex;
    align-items: center;

    width: 420px;
    min-width: 420px;
    max-width: 420px;

    margin-left: auto;
    margin-right: 0;
}

.toolbar .search-box .search-icon {
    position: absolute;
    left: 10px;
    color: var(--vscode-input-placeholderForeground);
    pointer-events: none;
    font-size: 20px;
    z-index: 1;
}

.toolbar .search-box input[type=search] {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 4px 8px 4px 36px;
    font: inherit;
    min-width: 120px;
}

.toolbar button:disabled,
.btn:disabled {
    opacity: 0.45;
    cursor: default;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground));
}

.toolbar button:disabled:hover,
.btn:disabled:hover {background: var(--vscode-button-secondaryBackground);}

`;
