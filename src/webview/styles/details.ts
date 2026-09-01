export const DETAILS_STYLES = `
.details h2 {
    font-size: 1rem;
    margin: 4px 0 12px 0;
}

.details table {
    width: 100%;
    border-collapse: collapse;
}

.details td {
    padding: 6px 8px;
    vertical-align: top;
    border-bottom: 1px solid var(--vscode-panel-border);
}

.details td.label {
    color: var(--vscode-descriptionForeground);
    width: 110px;
}

.details .value {
    display: flex;
    gap: 6px;
    align-items: center;
    word-break: break-all;
    min-width: 0;
}

.details .value input,
.details .value span {
    flex: 1;
    min-width: 0;
    white-space: pre-wrap;
    word-break: break-word;
}

.details .value span {
    max-height: 280px;
    overflow: auto;
}

.details .value input {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 3px 6px;
    font: inherit;
}

.details .actions {
    display: flex;
    gap: 6px;
    margin-top: 12px;
}

.details .value .field-action-btn {
    flex: 0 0 52px;
    width: 52px;
    min-width: 52px;
    text-align: center;
    justify-content: center;
}

.dbinfo-table {
    width: 100%;
    border-collapse: collapse;
}

.dbinfo-table td {
    padding: 4px 8px;
    vertical-align: top;
    border-bottom: 1px solid var(--vscode-panel-border);
    word-break: break-all;
}

.dbinfo-table td.label {
    color: var(--vscode-descriptionForeground);
    width: 170px;
    min-width: 170px;
    white-space: nowrap;
}
`;
