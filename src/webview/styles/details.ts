export const DETAILS_STYLES = `
.details h2 {font-size: 1rem; margin: 4px 0 12px 0;}
.details table {width: 100%; border-collapse: collapse;}
.details td {padding: 5px 8px; vertical-align: top; border-bottom: 1px solid var(--vscode-panel-border);}
.details td.label {color: var(--vscode-descriptionForeground); width: 110px;}

.details .value input,
.details .value span {max-height: 280px; overflow: auto;}
.details .value span {flex: 1; min-width: 0; white-space: pre-wrap; word-break: break-word;}
.details .value {display: flex; gap: 6px; align-items: center; word-break: break-all; min-width: 0;}

.details .value input {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 3px 6px;
    font: inherit;
}

.dbinfo-table {width: 100%; border-collapse: collapse;}
.details .actions {display: flex; gap: 6px; margin-top: 12px;}
.details .value .field-action-btn {flex: 0 0 52px; width: 52px; min-width: 52px; text-align: center; justify-content: center;}
.dbinfo-table td {padding: 4px 8px; vertical-align: top; border-bottom: 1px solid var(--vscode-panel-border); word-break: break-all;}
.dbinfo-table td.label {color: var(--vscode-descriptionForeground); width: 170px; min-width: 170px; white-space: nowrap;}

.details-tab {
    min-width: auto;
    padding: 6px 12px;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    cursor: pointer;
    font: inherit;
    }
    
.details-tabs {display: flex; gap: 0; margin: 0 0 12px; border-bottom: 1px solid var(--vscode-panel-border);}
.details-tab:hover {color: var(--vscode-foreground); background: var(--vscode-list-hoverBackground);}
.details-tab.active {color: var(--vscode-foreground); border-bottom-color: var(--vscode-focusBorder);}

.details-raw {position: relative; min-width: 0;}

.details-raw .icon-btn {
    position: sticky;
    top: 0;
    float: right;
    margin: 0 0 8px 8px;
    z-index: 1;
    background: var(--vscode-editor-background);
}

.details-raw pre {
    margin: 0;
    padding: 8px 0;
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
}

`;
