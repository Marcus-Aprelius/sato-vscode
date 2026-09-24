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
    gap: 0;
}

.converter-section:first-child {padding-right: 15px; border-right: 1px solid var(--vscode-panel-border);}
.converter-section:last-child {padding-left: 15px;}

.converter-source-actions .btn,
.converter-section {min-width: 0;}
.converter-source-actions .btn:hover,
.converter-section-header h3 {margin: 0;}
.converter-label {color: var(--vscode-descriptionForeground);}
.converter-section .converter-field:last-child {border-bottom: none;}
.converter-browse-btn {border: 1px solid var(--vscode-widget-border);}
.converter-section h3 {margin: 0 0 12px; font-size: 1em; font-weight: 600;}
.converter-copy-btn {width: 28px; min-width: 28px; height: 28px; margin: 0;}
.converter-modal {width: min(720px, 92vw); height: 440px; max-height: 90vh;}
.converter-modal > .modal-title {border-bottom: none;}
.converter-value {min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere;}
.converter-browse-btn {flex: 0 0 72px; width: 72px; min-width: 72px; padding: 5px 6px;}
.converter-path-row {display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0;}
.converter-section-header .btn {min-width: 72px; border: 1px solid var(--vscode-widget-border);}

.converter-hash {font-family: var(--vscode-editor-font-family); font-size: 0.9em; word-break: break-all;}
.converter-browse-btn:hover {border-color: var(--vscode-focusBorder); background: var(--vscode-list-hoverBackground);}
.converter-section-hint {margin-top: 3px; color: var(--vscode-descriptionForeground); font-size: 0.85em; font-weight: 400;}
.converter-section-header {display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px;}
.converter-section-header .btn:hover {border-color: var(--vscode-focusBorder); background: var(--vscode-list-hoverBackground);}
.converter-file-name-row {display: grid; grid-template-columns: minmax(0, 1fr) 28px; align-items: center; gap: 6px; width: 100%; min-width: 0;}

.converter-field {
    display: grid;
    grid-template-columns: 60px minmax(0, 1fr);
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid var(--vscode-panel-border);
    }

.converter-field-copy {
    grid-template-columns: 60px minmax(0, 1fr) 24px;
}

.converter-field-copy .icon-btn {
    width: 24px;
    min-width: 24px;
    height: 22px;
    margin: 0;
}

.modal-body .converter-input-field,
.modal-body .converter-input-field > select,
.modal-body .converter-input-field > input,
.modal-body label.converter-input-field > select,

.modal-body label.converter-input-field {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    color: var(--vscode-descriptionForeground);
}

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

.settings-tabs {display: flex; gap: 0; padding: 0 0 0 0px; border-bottom: 1px solid var(--vscode-panel-border);}

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

.settings-tab + .settings-tab {margin-left: 0px;}
.settings-tab:hover {color: var(--vscode-foreground); background: var(--vscode-list-hoverBackground); border-color: var(--vscode-focusBorder);}

.settings-tab.active {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
    border-bottom-color: var(--vscode-focusBorder);
}

.settings-tab-content {flex: 1;}
.settings-modal {width: min(430px, 92vw); height: 310px; max-height: 90vh;}
.settings-modal > .modal-title {border-bottom: none;}
.settings-modal .settings-tab-content {flex: 1; min-height: 0;}

.modal-body label.settings-number-row {display: grid; grid-template-columns: minmax(0, 1fr) 100px; align-items: center; gap: 12px;}
.settings-number-row input[type="number"] {width: 100px; min-width: 100px; padding: 4px 6px; text-align: center;}

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

.modal-body select {
    background: var(--vscode-dropdown-background);
    color: var(--vscode-dropdown-foreground);
    border: 1px solid var(--vscode-dropdown-border);
    padding: 5px 8px;
    font: inherit;
}

.modal-body select:focus {border-color: var(--vscode-focusBorder); outline: none;}
.converter-section:first-child .converter-section-hint {margin-top: -10px;}
.converter-tabs {display: flex; gap: 0; padding: 0 0 0 0px; border-bottom: 1px solid var(--vscode-panel-border);}

.converter-tab {
    padding: 7px 12px;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-widget-border);
    border-bottom: 2px solid transparent;
    border-radius: 3px 3px 0 0;
    cursor: pointer;
    font: inherit;
}

.converter-tab + .converter-tab {margin-left: 0px;}

.converter-tab:hover {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
}

.converter-tab.active {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
    border-bottom-color: var(--vscode-focusBorder);
}
.converter-title {display: flex; align-items: flex-start; gap: 8px;}
.converter-title .toolbar-logo {position: relative; top: 2px;}
.converter-title-icon {width: 16px; height: 16px; object-fit: contain;}
.converter-title img {margin-top: 3px;}

.about-modal > .modal-title {border-bottom: none;}

.about-tabs {
    display: flex;
    gap: 0;
    padding: 0;
    border-bottom: 1px solid var(--vscode-panel-border);
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

.about-tab + .about-tab {
    margin-left: 0;
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

`;
