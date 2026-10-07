import type { AppTheme } from "../render/types";

const THEME_CLASSES = [
    "sato-theme-dark",
    "sato-theme-gray",
    "sato-theme-light"
];

export function applyTheme(
    theme: AppTheme
): void {
    document.body.classList.remove(...THEME_CLASSES);

    if (theme !== "vscode") {
        document.body.classList.add(`sato-theme-${theme}`);
    }
}
