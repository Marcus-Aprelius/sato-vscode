export const ABOUT_STYLES = `
.about-logo {display: block; width: 96px; height: 96px; object-fit: contain; margin: 0 auto 8px auto;}

.about-supports {
    box-sizing: border-box;
    width: 390px;
    max-width: calc(100% - 32px);
    margin: 26px auto 0;
    padding-right: 20px;
    text-align: left;
    line-height: 1.6;
    color: var(--vscode-descriptionForeground);
    transform: translateX(-22px);
}

.about-supports-title {margin-bottom: 2px; text-align: left;}
.about-supports-row {display: grid; grid-template-columns: 58px minmax(0, 1fr); column-gap: 8px; align-items: start; text-align: left;}
.about-supports strong {color: var(--vscode-foreground); font-weight: 600;}
.about-supports span {min-width: 0; overflow-wrap: anywhere;}

.about-tabs {display: flex; gap: 0; padding: 0 14px; border-bottom: 1px solid var(--vscode-panel-border);}

.about-tab {
    padding: 7px 12px;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-widget-border);
    border-bottom: 2px solid transparent;
    border-radius: 3px 3px 0 0;
    cursor: pointer;
    font: inherit;
}

.about-tab:hover {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
}

.about-tab.active {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
    border-bottom-color: var(--vscode-focusBorder);
}

.about-modal {width: 480px; height: 400px; max-height: 90vh;}
.about-modal > .modal-body {flex: 1;}

.about-version {display: flex; align-items: center; justify-content: center; gap: 8px;}
.about-version .icon-btn {flex: 0 0 auto; margin-left: 0;}

.about-inline-link {
    padding: 0;
    background: transparent;
    color: var(--vscode-textLink-foreground);
    border: none;
    cursor: pointer;
    font: inherit;
    text-decoration: none;
}

.about-inline-link:hover {
    color: var(--vscode-textLink-activeForeground);
    text-decoration: underline;
}

`;
