
import { maybeById } from "./dom";
import { isCryptoFileView, isReadOnlyVault } from "./state";

export function setLockButtonState(_locked: boolean): void {
}

export function updateMainActionButton(): void {
}

export function updateToolbarForMode(): void {
    const entryButton = maybeById<HTMLButtonElement>("btn-entry");
    const folderButton = maybeById<HTMLButtonElement>("btn-folder");

    if (!entryButton || !folderButton) {
        return;
    }

    const disabled = isCryptoFileView() || isReadOnlyVault();

    entryButton.disabled = disabled;
    folderButton.disabled = disabled;

    if (isCryptoFileView()) {
        entryButton.title = "Entry actions are not available for crypto files";
        folderButton.title = "Folder actions are not available for crypto files";

        return;
    }

    if (isReadOnlyVault()) {
        entryButton.title = "Entry actions are not available in read-only mode";
        folderButton.title = "Folder actions are not available in read-only mode";

        return;
    }

    entryButton.title = "Entry";
    folderButton.title = "Folder";
}

export function getLockButtonMode(): string {
    return "none";
}
