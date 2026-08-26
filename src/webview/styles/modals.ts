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

.modal-backdrop.open {
    display: flex;
}

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

.modal.open {
    display: flex;
}

.modal-title {
    padding: 10px 14px;
    font-weight: 600;
    border-bottom: 1px solid var(--vscode-panel-border);
}

.modal-body {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
}

.modal-body label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.9em;
    color: var(--vscode-descriptionForeground);
}

.modal-body label.checkbox {
    flex-direction: row;
    align-items: center;
    color: var(--vscode-foreground);
}

.modal-body input[type=text],
.modal-body input[type=password],
.modal-body textarea {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 5px 8px;
    font: inherit;
}

.modal-body .row {
    display: flex;
    gap: 6px;
}

.modal-body .row input[type=text],
.modal-body .row input[type=password] {
    flex: 1;
}

.modal-footer {
    padding: 10px 14px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid var(--vscode-panel-border);
}

.strength {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 14px;
}

.strength-bar {
    height: 4px;
    flex: 1;
    background: var(--vscode-input-border, #444);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
}

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

.strength span {
    font-size: 0.8em;
    color: var(--vscode-descriptionForeground);
    min-width: 60px;
}

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
`;
