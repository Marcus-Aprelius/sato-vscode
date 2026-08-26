export const ABOUT_STYLES = `
.about-logo {
    display: block;
    width: 96px;
    height: 96px;
    object-fit: contain;
    margin: 0 auto 8px auto;
}

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

.about-supports-title {
    margin-bottom: 2px;
    text-align: left;
}

.about-supports-row {
    display: grid;
    grid-template-columns: 58px minmax(0, 1fr);
    column-gap: 8px;
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
`;
