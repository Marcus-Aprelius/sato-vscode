export const BASE_STYLES = `
* { box-sizing: border-box; }

body.sato-theme-dark {
    --vscode-editor-background: #1e1e1e;
    --vscode-foreground: #d4d4d4;
    --vscode-descriptionForeground: #a8a8a8;
    --vscode-panel-border: #3c3c3c;

    --vscode-input-background: #252526;
    --vscode-input-foreground: #f0f0f0;
    --vscode-input-border: #4a4a4a;
    --vscode-input-placeholderForeground: #8c8c8c;

    --vscode-button-background: #0e639c;
    --vscode-button-foreground: #ffffff;
    --vscode-button-hoverBackground: #1177bb;
    --vscode-button-secondaryBackground: #3a3d41;
    --vscode-button-secondaryForeground: #ffffff;
    --vscode-button-secondaryHoverBackground: #45494e;

    --vscode-list-hoverBackground: #2a2d2e;
    --vscode-list-activeSelectionBackground: #094771;
    --vscode-list-activeSelectionForeground: #ffffff;

    --vscode-dropdown-background: #252526;
    --vscode-dropdown-foreground: #f0f0f0;
    --vscode-dropdown-border: #4a4a4a;

    --vscode-widget-border: #454545;
    --vscode-focusBorder: #007fd4;
    --vscode-icon-foreground: #c5c5c5;
    --vscode-textLink-foreground: #4daafc;
    --vscode-textLink-activeForeground: #75beff;

    --vscode-statusBar-background: #181818;
    --vscode-statusBar-foreground: #d4d4d4;
    --vscode-sideBarSectionHeader-background: #252526;
}

body.sato-theme-gray {
    --vscode-editor-background: #34373b;
    --vscode-foreground: #ececec;
    --vscode-descriptionForeground: #c0c3c7;
    --vscode-panel-border: #555a60;

    --vscode-input-background: #41454a;
    --vscode-input-foreground: #ffffff;
    --vscode-input-border: #636970;
    --vscode-input-placeholderForeground: #b4b8bd;

    --vscode-button-background: #526d82;
    --vscode-button-foreground: #ffffff;
    --vscode-button-hoverBackground: #607f98;
    --vscode-button-secondaryBackground: #4b5056;
    --vscode-button-secondaryForeground: #ffffff;
    --vscode-button-secondaryHoverBackground: #5a6067;

    --vscode-list-hoverBackground: #454a50;
    --vscode-list-activeSelectionBackground: #596f80;
    --vscode-list-activeSelectionForeground: #ffffff;

    --vscode-dropdown-background: #41454a;
    --vscode-dropdown-foreground: #ffffff;
    --vscode-dropdown-border: #636970;

    --vscode-widget-border: #60656c;
    --vscode-focusBorder: #88a9c0;
    --vscode-icon-foreground: #e0e3e6;
    --vscode-textLink-foreground: #8ec7ef;
    --vscode-textLink-activeForeground: #b4ddfa;

    --vscode-statusBar-background: #2c2f33;
    --vscode-statusBar-foreground: #ececec;
    --vscode-sideBarSectionHeader-background: #3d4146;
}

body.sato-theme-light {
    --vscode-editor-background: #f5f5f5;
    --vscode-foreground: #242424;
    --vscode-descriptionForeground: #606060;
    --vscode-panel-border: #d0d0d0;

    --vscode-input-background: #ffffff;
    --vscode-input-foreground: #202020;
    --vscode-input-border: #b8b8b8;
    --vscode-input-placeholderForeground: #777777;

    --vscode-button-background: #0067a3;
    --vscode-button-foreground: #ffffff;
    --vscode-button-hoverBackground: #00588c;
    --vscode-button-secondaryBackground: #e4e4e4;
    --vscode-button-secondaryForeground: #242424;
    --vscode-button-secondaryHoverBackground: #d7d7d7;

    --vscode-list-hoverBackground: #e8e8e8;
    --vscode-list-activeSelectionBackground: #cce5f5;
    --vscode-list-activeSelectionForeground: #111111;

    --vscode-dropdown-background: #ffffff;
    --vscode-dropdown-foreground: #202020;
    --vscode-dropdown-border: #b8b8b8;

    --vscode-widget-border: #c5c5c5;
    --vscode-focusBorder: #0078d4;
    --vscode-icon-foreground: #424242;
    --vscode-textLink-foreground: #006ab1;
    --vscode-textLink-activeForeground: #004f85;

    --vscode-statusBar-background: #e7e7e7;
    --vscode-statusBar-foreground: #242424;
    --vscode-sideBarSectionHeader-background: #ebebeb;

    --vscode-errorForeground: #b00020;
    --vscode-editorWarning-foreground: #8a5a00;
    --vscode-testing-iconPassed: #167d34;
}

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
