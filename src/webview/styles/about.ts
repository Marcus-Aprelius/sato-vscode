export const ABOUT_STYLES = `
.about-logo {display: block; width: 96px; height: 96px; object-fit: contain; margin: 0 auto 8px auto;}

.about-supports {
    box-sizing: border-box;
    width: calc(100% + 16px);
    max-width: none;
    margin: 4px -8px 0 -8px;
    padding: 0 8px;
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
.about-supports strong {color: var(--vscode-foreground); font-weight: 600;}
.about-supports span {min-width: 0; overflow-wrap: anywhere;}
.about-modal {position: relative; top: -14px; width: 550px; height: 435px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px);}
.about-modal > .modal-body {flex: 1; min-height: 0;}
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

.about-formats-list > div {display: block; margin: 0; padding: 0; white-space: nowrap;}
.about-header-text {margin-left: -8px; margin-top: 0;}
.about-header {position: relative; top: -6px; margin-bottom: -6px;}

.format-link {color: var(--vscode-textLink-foreground); text-decoration: none;}
.format-link:hover {text-decoration: underline;}

`;
