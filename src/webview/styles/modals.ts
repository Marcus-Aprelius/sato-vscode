export const MODAL_STYLES = `
.modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 900;
    align-items: center;
    justify-content: center;
}

.modal-backdrop.open {display: flex;}

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

.modal.open {display: flex;}
.modal-title {padding: 10px 14px; font-weight: 600; border-bottom: 1px solid var(--vscode-panel-border);}

.modal-body {padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto;}
.modal-body label {display: flex; flex-direction: column; gap: 4px; font-size: 0.9em; color: var(--vscode-descriptionForeground);}
.modal-body label.checkbox {flex-direction: row; align-items: center; color: var(--vscode-foreground);}
.modal-body input[type=text],
.modal-body input[type=password],

.modal-body textarea {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 5px 8px;
    font: inherit;
}

.modal-body .row {display: flex; gap: 6px;}
.modal-body .row input[type=text],
.modal-body .row input[type=password] {flex: 1;}
.modal-footer {padding: 10px 14px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--vscode-panel-border);}

.strength {display: flex; align-items: center; gap: 6px; height: 14px;}
.strength-bar {height: 4px; flex: 1; background: var(--vscode-input-border, #444); border-radius: 2px; overflow: hidden; position: relative;}

.strength-bar::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: var(--pct, 0%);
    background: var(--color, #888);
    transition: width 0.15s ease;
}

.strength span {font-size: 0.8em; color: var(--vscode-descriptionForeground); min-width: 60px;}
.unlock-password-field {position: relative; display: flex; align-items: center;}
.unlock-password-field input {width: 100%; padding-right: 52px;}

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

.keyboard-layout-indicator.ru {color: var(--vscode-charts-yellow);}
.keyboard-layout-indicator.eng {color: var(--vscode-textLink-foreground);}
.capslock-warning {color: var(--vscode-errorForeground); font-size: 12px; margin-top: -4px; white-space: nowrap; padding-right: 12px;}
.unlock-modal-footer {align-items: center; justify-content: space-between;}
.unlock-modal-actions {display: flex; gap: 8px; margin-left: auto;}

.converter-columns {
    display: grid;
    grid-template-columns:
        minmax(0, 1fr)
        minmax(0, 1fr);
    gap: 24px;
}

.converter-section {min-width: 0;}
.converter-section h3 {margin: 0 0 12px; font-size: 1em; font-weight: 600;}

.converter-field {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr);
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid var(--vscode-panel-border);
}

.converter-section .converter-field:last-child {border-bottom: none;}
.converter-label {color: var(--vscode-descriptionForeground);}
.converter-value {min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere;}
.converter-hash {font-family: var(--vscode-editor-font-family); font-size: 0.9em; word-break: break-all;}

.modal-body .converter-input-field,
.modal-body label.converter-input-field {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    color: var(--vscode-descriptionForeground);
}

.modal-body .converter-input-field > select,
.modal-body .converter-input-field > input,
.modal-body label.converter-input-field > select,
.modal-body label.converter-input-field > input {
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 5px 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    font: inherit;
}
.converter-path-row {display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0;}

.modal-body .converter-path-row input {
    flex: 1 1 auto;
    width: 0;
    min-width: 0;
    margin: 0;
    padding: 5px 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    font: inherit;
}

.converter-browse-btn {flex: 0 0 72px; width: 72px; min-width: 72px; padding: 5px 6px;}
.converter-note {margin-top: 16px; color: var(--vscode-descriptionForeground); font-size: 0.9em; line-height: 1.4;}
.settings-tabs {display: flex; gap: 0; padding: 0 14px; border-bottom: 1px solid var(--vscode-panel-border);}

.settings-tab {
    padding: 7px 12px;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-widget-border);
    border-bottom: 2px solid transparent;
    border-radius: 3px 3px 0 0;
    cursor: pointer;
    font: inherit;
}

.settings-tab + .settings-tab {margin-left: 4px;}
.settings-tab:hover {color: var(--vscode-foreground); background: var(--vscode-list-hoverBackground); border-color: var(--vscode-focusBorder);}

.settings-tab.active {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
    border-bottom-color: var(--vscode-focusBorder);
}

.settings-tab-content {flex: 1;}
.settings-modal {width: min(430px, 92vw); height: 310px; max-height: 90vh;}
.settings-modal .settings-tab-content {flex: 1; min-height: 0;}

.modal-body label.settings-number-row {display: grid; grid-template-columns: minmax(0, 1fr) 100px; align-items: center; gap: 12px;}
.settings-number-row input[type="number"] {width: 100px; min-width: 100px; padding: 4px 6px; text-align: center;}

.converter-file-name-row {display: grid; grid-template-columns: minmax(0, 1fr) 28px; align-items: center; gap: 6px; width: 100%; min-width: 0;}
.converter-copy-btn {width: 28px; min-width: 28px; height: 28px; margin: 0;}

.converter-file-name-row > input {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 5px 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    font: inherit;
}

`;
