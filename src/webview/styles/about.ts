export const ABOUT_STYLES = `
.about-logo {display: block; width: 96px; height: 96px; object-fit: contain; margin: 0 auto 8px auto;}

.about-supports {
    box-sizing: border-box;
    width: 100%;
    max-width: none;
    margin: 4px 0 0;
    padding: 0 12px;
    text-align: left;
    line-height: 1.25;
    color: var(--vscode-descriptionForeground);
    transform: none;
}

.about-supports-title {margin-bottom: 2px; text-align: left;}
.about-supports-row {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    column-gap: 6px;
    align-items: start;
    text-align: left;
}
.about-supports strong {
    color: var(--vscode-foreground);
    font-weight: 600;
}
.about-supports span {
    min-width: 0;
    overflow-wrap: anywhere;
}

.about-tabs {
    display: flex;
    gap: 0;
    padding: 0;
    border-bottom: 1px solid var(--vscode-panel-border);
}

.about-tab + .about-tab {
    margin-left: 0;
}
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

.about-modal {
    position: relative;
    top: -14px;
    width: 550px;
    height: 435px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
}
.about-modal > .modal-body {
    flex: 1;
    min-height: 0;
}
#supported-formats-content {
    padding: 2px 8px 0 !important;
}

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

.about-inline-link:hover {color: var(--vscode-textLink-activeForeground); text-decoration: underline;}
.about-formats-list {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    row-gap: 5px;
    min-width: 0;
    line-height: 1.3;
    color: var(--vscode-descriptionForeground);
}

.about-formats-list > div {
    display: block;
    margin: 0;
    padding: 0;
    white-space: nowrap;
}

`;
