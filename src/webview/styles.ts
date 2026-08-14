export const STYLES = `
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }

.toolbar .search-box {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 120px;
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
    background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
}

.icon-btn .codicon {
    font-size: 20px;
}


.about-logo {
    display: block;
    width: 96px;
    height: 96px;
    object-fit: contain;
    margin: 0 auto 8px auto;
}
body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    font-size: var(--vscode-font-size, 13px);
}
.app { display: grid; grid-template-rows: auto 1fr auto; height: 100vh; }
.toolbar {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
}
.brand { font-weight: 600; margin-right: 8px; }

.btn {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 4px 10px;
    cursor: pointer;
    font: inherit;
    border-radius: 2px;
    white-space: nowrap;
}
.btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
.btn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
.btn.primary:hover { background: var(--vscode-button-hoverBackground); }
.btn.danger { background: var(--vscode-errorForeground); color: var(--vscode-editor-background); }

#btn-settings .codicon { font-size: 12px; line-height: 1; transform: translateY(1px); }

#btn-lock {
    width: 96px;
    justify-content: center;
    gap: 4px;
}

#btn-lock .codicon {
    font-size: 12px;
    line-height: 1;
    transform: translateY(1px);
}

#btn-lock[data-locked="false"] .codicon {
    color: var(--vscode-charts-yellow);
}

#btn-lock[data-locked="true"] .codicon {
    color: var(--vscode-testing-iconPassed, var(--vscode-textLink-foreground));
}

#btn-lock:active .codicon {
    color: var(--vscode-focusBorder);
}

.layout {
    display: grid;
    grid-template-columns: 240px 4px 300px 4px 1fr;
    overflow: hidden;
}

.col-resizer {
    cursor: col-resize;
    background: transparent;
    border-right: 1px solid var(--vscode-panel-border);
    z-index: 10;
    user-select: none;
    touch-action: none;
}

.col-resizer:hover,
.col-resizer.active {
    background: var(--vscode-focusBorder);
}

body.resizing,
body.resizing * {
    cursor: col-resize !important;
    user-select: none !important;
}

.pane {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
}

.pane:last-child { border-right: none; }
.pane-title {
    padding: 6px 10px;
    font-size: 0.85em;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBarSectionHeader-background, transparent);
}

.tree, .entry-list, .details {
    padding: 6px;
    overflow: auto;
    flex: 1;
}
.tree ul { list-style: none; margin: 0; padding-left: 14px; }
.tree > ul { padding-left: 0; }
.group-node {
    display: flex; align-items: center; gap: 4px;
    padding: 3px 6px;
    cursor: pointer;
    border-radius: 2px;
    user-select: none;
}
.group-node:hover { background: var(--vscode-list-hoverBackground); }
.group-node.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
.group-caret { width: 12px; display: inline-block; text-align: center; opacity: 0.6; }
.group-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-count { color: var(--vscode-descriptionForeground); font-size: 0.85em; }

.entry-row {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 6px;
    cursor: pointer;
    border-radius: 2px;
    user-select: none;
}
.entry-row:hover { background: var(--vscode-list-hoverBackground); }
.entry-row.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
.entry-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entry-sub { color: var(--vscode-descriptionForeground); font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { font-size: 0.75em; padding: 1px 5px; border-radius: 8px; }
.badge.expired { background: var(--vscode-errorForeground); color: var(--vscode-editor-background); }
.badge.weak { background: var(--vscode-editorWarning-foreground, #d19a66); color: var(--vscode-editor-background); }

.details h2 { font-size: 1rem; margin: 4px 0 12px 0; }
.details table { width: 100%; border-collapse: collapse; }
.details td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid var(--vscode-panel-border); }
.details td.label { color: var(--vscode-descriptionForeground); width: 110px; }
.details .value { display: flex; gap: 6px; align-items: center; word-break: break-all; min-width: 0; }
.details .value input, .details .value span { flex: 1; min-width: 0; }
.details .value input {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 3px 6px;
    font: inherit;
}
.details .actions { display: flex; gap: 6px; margin-top: 12px; }

.empty { color: var(--vscode-descriptionForeground); padding: 12px; }

.statusbar {
    display: flex; gap: 14px;
    padding: 4px 10px;
    border-top: 1px solid var(--vscode-panel-border);
    background: var(--vscode-statusBar-background, var(--vscode-editor-background));
    color: var(--vscode-statusBar-foreground, var(--vscode-foreground));
    font-size: 0.85em;
}
.statusbar .item { display: inline-flex; gap: 4px; }
.statusbar .item strong { font-weight: 600; }
.statusbar .warn { color: var(--vscode-editorWarning-foreground, #d19a66); }
.statusbar .err { color: var(--vscode-errorForeground); }

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
.ctx-menu.open { display: block; }
.ctx-item {
    padding: 4px 14px;
    cursor: pointer;
    user-select: none;
}
.ctx-item:hover { background: var(--vscode-menu-selectionBackground, var(--vscode-list-activeSelectionBackground)); color: var(--vscode-menu-selectionForeground, var(--vscode-list-activeSelectionForeground)); }
.ctx-sep { height: 1px; background: var(--vscode-menu-separatorBackground, var(--vscode-panel-border)); margin: 4px 0; }

.modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 900;
    align-items: center;
    justify-content: center;
}
.modal-backdrop.open { display: flex; }
.modal {
    display: none;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    width: min(480px, 92vw);
    max-height: 90vh;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
}
.modal.open { display: flex; }
.modal-title {
    padding: 10px 14px;
    font-weight: 600;
    border-bottom: 1px solid var(--vscode-panel-border);
}
.modal-body {
    padding: 12px 14px;
    display: flex; flex-direction: column; gap: 10px;
    overflow-y: auto;
}
.modal-body label { display: flex; flex-direction: column; gap: 4px; font-size: 0.9em; color: var(--vscode-descriptionForeground); }
.modal-body label.checkbox { flex-direction: row; align-items: center; color: var(--vscode-foreground); }
.modal-body input[type=text], .modal-body input[type=password], .modal-body textarea {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 5px 8px;
    font: inherit;
}
.modal-body .row { display: flex; gap: 6px; }
.modal-body .row input[type=text], .modal-body .row input[type=password] { flex: 1; }
.modal-footer {
    padding: 10px 14px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid var(--vscode-panel-border);
}

.strength { display: flex; align-items: center; gap: 6px; height: 14px; }
.strength-bar {
    height: 4px; flex: 1; background: var(--vscode-input-border, #444); border-radius: 2px; overflow: hidden;
    position: relative;
}
.strength-bar::after {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
    width: var(--pct, 0%); background: var(--color, #888);
    transition: width 0.15s ease;
}
.strength span { font-size: 0.8em; color: var(--vscode-descriptionForeground); min-width: 60px; }

.unlock-password-field {
    position: relative;
    display: flex;
    align-items: center;
}

.unlock-password-field input {
    width: 100%;
    padding-right: 52px;
}

.keyboard-layout-indicator {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    line-height: 1;
    color: var(--vscode-descriptionForeground);
    pointer-events: none;
    user-select: none;
}

.keyboard-layout-indicator.ru {
    color: var(--vscode-charts-yellow);
}

.keyboard-layout-indicator.eng {
    color: var(--vscode-textLink-foreground);
}

.capslock-warning {
    color: var(--vscode-errorForeground);
    font-size: 12px;
    margin-top: -4px;
}

.unlock-modal-footer {
    align-items: center;
    justify-content: space-between;
}

.unlock-modal-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
}

.capslock-warning {
    color: var(--vscode-errorForeground);
    font-size: 12px;
    white-space: nowrap;
    padding-right: 12px;
}

.dbinfo-table { width: 100%; border-collapse: collapse; }
.dbinfo-table td { padding: 4px 8px; vertical-align: top; border-bottom: 1px solid var(--vscode-panel-border); word-break: break-all; }
.dbinfo-table td.label { color: var(--vscode-descriptionForeground); width: 130px; }
`;
