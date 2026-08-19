import { maybeById } from "./dom";
import { isCryptoFileView } from "./state";

export function setLockButtonState(_locked: boolean): void {
}

export function updateMainActionButton(): void {
}

export function updateToolbarForMode(): void {
    const entryBtn = maybeById<HTMLButtonElement>("btn-entry");
    const folderBtn = maybeById<HTMLButtonElement>("btn-folder");

    if (!entryBtn || !folderBtn) {
        return;
    }

    const disabled = isCryptoFileView();

    entryBtn.disabled = disabled;
    folderBtn.disabled = disabled;
}

export function getLockButtonMode(): string {
    return "none";
}
