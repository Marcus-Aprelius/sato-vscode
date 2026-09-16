export const CONTEXT_MENU_STYLES = `
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

.ctx-menu.open {display: block;}

.ctx-item {display: flex; align-items: center; gap: 8px; padding: 4px 14px; cursor: pointer; user-select: none;}
.ctx-item-label {flex: 1;}
.ctx-item-icon {font-size: 14px; opacity: 0.95;}
.ctx-item-icon-left {flex: 0 0 auto;}
.ctx-item-icon-right {flex: 0 0 auto; margin-left: auto;}
.ctx-item-icon.unlocked {color: var(--vscode-charts-yellow);}
.ctx-item-icon.locked {color: var(--vscode-testing-iconPassed, var(--vscode-textLink-foreground));}
.ctx-item-icon {font-size: 14px; opacity: 0.8;}

.ctx-item:hover {
    background: var(--vscode-menu-selectionBackground,var(--vscode-list-activeSelectionBackground));
    color: var(--vscode-menu-selectionForeground, var(--vscode-list-activeSelectionForeground));
}

.ctx-sep {
    height: 1px;
    background: var(--vscode-menu-separatorBackground, var(--vscode-panel-border));
    margin: 4px 0;
}

.ctx-item.disabled {
    opacity: 0.45;
    cursor: default;
    color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground));
}

.ctx-item.disabled:hover {
    background: transparent;
    color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground));
}
`;
