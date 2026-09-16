export const LAYOUT_STYLES = `
.layout {display: grid; grid-template-columns: 240px 4px 300px 4px 1fr; overflow: hidden;}

.col-resizer {
    cursor: col-resize;
    background: transparent;
    border-right: 1px solid var(--vscode-panel-border);
    z-index: 10;
    user-select: none;
    touch-action: none;
}

.col-resizer:hover,
.col-resizer.active {background: var(--vscode-focusBorder);}

body.resizing,
body.resizing * {cursor: col-resize !important; user-select: none !important;}

.pane {display: flex; flex-direction: column; overflow: hidden; min-width: 0;}
.pane:last-child {border-right: none;}

.pane-title {
    padding: 6px 10px;
    font-size: 0.85em;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBarSectionHeader-background, transparent);
}

.tree,
.entry-list,

.details {padding: 6px; overflow: auto; flex: 1;}
.details {overflow-y: scroll; overflow-x: hidden; scrollbar-gutter: stable;}

.tree ul {list-style: none; margin: 0; padding-left: 14px;}
.tree > ul {padding-left: 0;}

.group-node {display: flex; align-items: center; gap: 4px; padding: 3px 6px; cursor: pointer; border-radius: 2px; user-select: none;}
.group-node:hover {background: var(--vscode-list-hoverBackground);}
.group-node.active {background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground);}
.group-caret {width: 12px; display: inline-block; text-align: center; opacity: 0.6;}
.group-label {flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;}
.group-count {color: var(--vscode-descriptionForeground); font-size: 0.85em;}

.entry-row {display: flex; align-items: center; gap: 6px; padding: 4px 6px; cursor: pointer; border-radius: 2px; user-select: none;}
.entry-row:hover {background: var(--vscode-list-hoverBackground);}
.entry-row.active {background: var(--vscode-list-activeSelectionBackground);color: var(--vscode-list-activeSelectionForeground);}

.entry-title {flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;}
.entry-sub {color: var(--vscode-descriptionForeground); font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;}

.badge {font-size: 0.75em; padding: 1px 5px; border-radius: 8px;}
.badge.expired {background: var(--vscode-errorForeground); color: var(--vscode-editor-background);}
.badge.weak {background: var(--vscode-editorWarning-foreground, #d19a66); color: var(--vscode-editor-background);}

.statusbar {
    display: flex;
    gap: 14px;
    padding: 4px 10px;
    border-top: 1px solid var(--vscode-panel-border);
    background: var(--vscode-statusBar-background, var(--vscode-editor-background));
    color: var(--vscode-statusBar-foreground, var(--vscode-foreground));
    font-size: 0.85em;
}

.statusbar .item {display: inline-flex; gap: 4px;}
.statusbar .item strong {font-weight: 600;}
.statusbar .warn {color: var(--vscode-editorWarning-foreground, #d19a66);}
.statusbar .err {color: var(--vscode-errorForeground);}
.statusbar .success {color: var(--vscode-testing-iconPassed, #4ec9b0);}
.statusbar .status-label {color: var(--vscode-foreground, #ffffff); font-size: calc(1em + 1px); font-weight: 600;}
.statusbar .status-value {color: var(--vscode-statusBar-foreground, var(--vscode-descriptionForeground)); font-size: 1em; font-weight: 400;}
.statusbar .validity-days {font-weight: 600;}
.statusbar .validity-days.success {color: var(--vscode-testing-iconPassed, #4ec9b0);}
.statusbar .validity-days.warn {color: var(--vscode-editorWarning-foreground, #d19a66);}
.statusbar .validity-days.err {color: var(--vscode-errorForeground);}

.layout.crypto-layout .entries-pane,
.layout.crypto-layout #resize-entries {display: none;}

`;
