import { maybeById } from "../dom";
import { vscode } from "../globals";
import { entryIndex } from "../state";
import { closeModal, openModal } from "./modalLifecycle";
import { modalState, resetCryptoUnlockState } from "./state";

import {
    detectKeyboardLayoutFromText,
    setKeyboardLayout,
    updateCapsLockWarning,
    updateKeyboardLayoutFromEvent
} from "./inputHints";

export function openCryptoContainerUnlockModal(entryId: string): void {
    modalState.cryptoUnlockEntryId = entryId;
    modalState.openPgpPrivateKeyPath = "";

    const entry = entryIndex.get(entryId);

    modalState.cryptoUnlockRequiresPrivateKey = entry?.values?.Type === "OpenPGP Encrypted Message";

    const title = maybeById<HTMLElement>("crypto-unlock-title");
    const label = maybeById<HTMLElement>("crypto-unlock-password-label");
    const keyRow = maybeById<HTMLElement>("crypto-unlock-key-row");
    const keyPath = maybeById<HTMLInputElement>("crypto-unlock-key-path");
    const password = maybeById<HTMLInputElement>("crypto-unlock-password");
    const error = maybeById<HTMLElement>("crypto-unlock-error");
    const capsWarning = maybeById<HTMLElement>("crypto-unlock-capslock-warning");

    if (title) {
        title.textContent = modalState.cryptoUnlockRequiresPrivateKey ? "Decrypt OpenPGP Message" : "Unlock Crypto Container";
    }

    if (label) {
        label.textContent = modalState.cryptoUnlockRequiresPrivateKey ? "OpenPGP passphrase" : "Container password";
    }

    if (keyRow) {
        keyRow.style.display = modalState.cryptoUnlockRequiresPrivateKey ? "" : "none";
    }

    if (password) {
        password.value = "";
    }

    if (keyPath) {
        const detectedPath = modalState.cryptoUnlockRequiresPrivateKey ? findOpenPgpPrivateKeyPath() : "";

        modalState.openPgpPrivateKeyPath = detectedPath;
        keyPath.value = detectedPath;
    }

    if (error) {
        error.textContent = "";
        error.style.display = "none";
    }

    if (capsWarning) {
        capsWarning.style.display = "none";
    }

    setCryptoKeyboardLayout("ENG");
    updateCryptoUnlockOkState();
    openModal("crypto-unlock-modal");

    setTimeout(() => {
        if (password) {
            password.value = "";
            password.focus();
        }

        updateCryptoUnlockOkState();
    }, 0);
}

export function closeCryptoContainerUnlockModal(): void {
    const password = maybeById<HTMLInputElement>("crypto-unlock-password");
    const keyPath = maybeById<HTMLInputElement>("crypto-unlock-key-path");
    const error = maybeById<HTMLElement>("crypto-unlock-error");
    const capsWarning = maybeById<HTMLElement>("crypto-unlock-capslock-warning");

    if (password) {
        password.value = "";
    }

    if (keyPath) {
        keyPath.value = "";
    }

    if (error) {
        error.textContent = "";
        error.style.display = "none";
    }

    if (capsWarning) {
        capsWarning.style.display = "none";
    }

    resetCryptoUnlockState();

    closeModal();
}

export function showCryptoContainerUnlockError(message: string): void {
    const error = maybeById<HTMLElement>("crypto-unlock-error");
    const password = maybeById<HTMLInputElement>("crypto-unlock-password");

    if (error) {
        error.textContent = message || "Failed to unlock crypto container.";
        error.style.display = "";
    }

    if (password) {
        password.select();
        password.focus();
    }
}

export function setOpenPgpPrivateKeyPath(entryId: string, filePath: string ): void {
    if (!modalState.cryptoUnlockEntryId || modalState.cryptoUnlockEntryId !== entryId) {
        return;
    }

    modalState.openPgpPrivateKeyPath = filePath;

    const input = maybeById<HTMLInputElement>("crypto-unlock-key-path");

    if (input) {
        input.value = filePath;
    }

    const error = maybeById<HTMLElement>("crypto-unlock-error");

    if (error) {
        error.textContent = "";
        error.style.display = "none";
    }

    updateCryptoUnlockOkState();
}

export function submitCryptoContainerPassword(): void {
    const input = maybeById<HTMLInputElement>("crypto-unlock-password");

    if (!input || !modalState.cryptoUnlockEntryId) {
        return;
    }

    const password = input.value;

    if (!password) {
        input.focus();
        return;
    }

    if (modalState.cryptoUnlockRequiresPrivateKey && !modalState.openPgpPrivateKeyPath) {
        showCryptoContainerUnlockError("Select an OpenPGP private key file.");
        return;
    }

    vscode.postMessage({
        type: "unlockCryptoContainer",
        entryId: modalState.cryptoUnlockEntryId,
        password,
        privateKeyPath: modalState.cryptoUnlockRequiresPrivateKey ? modalState.openPgpPrivateKeyPath : undefined
    });
}

function setCryptoKeyboardLayout(layout: string): void {
    setKeyboardLayout("crypto-unlock-layout", layout);
}

function updateCryptoUnlockInputHints(event: KeyboardEvent): void {
    updateKeyboardLayoutFromEvent(event, "crypto-unlock-password", "crypto-unlock-layout");

    updateCapsLockWarning(event, "crypto-unlock-capslock-warning");
}

function updateCryptoUnlockOkState(): void {
    const password = maybeById<HTMLInputElement>("crypto-unlock-password");
    const ok = maybeById<HTMLButtonElement>("crypto-unlock-ok");

    if (!ok) {
        return;
    }

    const hasPassword = !!password?.value;
    const hasRequiredKey = !modalState.cryptoUnlockRequiresPrivateKey || !!modalState.openPgpPrivateKeyPath;

    ok.disabled = !hasPassword || !hasRequiredKey;
}

function findOpenPgpPrivateKeyPath(): string {
    for (const entry of entryIndex.values()) {
        if (entry.values?.Type === "OpenPGP Private Key" && entry.values["File path"]) {
            return entry.values["File path"];
        }
    }

    return "";
}

export function bindCryptoUnlockModalActions(): void {
    maybeById("crypto-unlock-cancel")?.addEventListener("click", closeCryptoContainerUnlockModal);
    maybeById("crypto-unlock-ok")?.addEventListener("click", submitCryptoContainerPassword);

    maybeById("crypto-unlock-key-browse")?.addEventListener("click",
        () => {
            if (!modalState.cryptoUnlockEntryId) {
                return;
            }

            vscode.postMessage({type: "selectOpenPgpPrivateKey", entryId: modalState.cryptoUnlockEntryId});
        }
    );

    const cryptoUnlockPassword = maybeById<HTMLInputElement>("crypto-unlock-password");

    if (cryptoUnlockPassword) {
        cryptoUnlockPassword.addEventListener("keydown", (event) => {
            updateCryptoUnlockInputHints(event);

            if (event.key === "Enter") {
                submitCryptoContainerPassword();
            }

            if (event.key === "Escape") {
                closeCryptoContainerUnlockModal();
            }
        });

        cryptoUnlockPassword.addEventListener("keyup", updateCryptoUnlockInputHints);

        cryptoUnlockPassword.addEventListener("input", () => {
            const detected = detectKeyboardLayoutFromText(cryptoUnlockPassword.value);

            if (detected) {
                setCryptoKeyboardLayout(detected);
            }

            updateCryptoUnlockOkState();
        });

        cryptoUnlockPassword.addEventListener("focus", () => {
            setCryptoKeyboardLayout(detectKeyboardLayoutFromText(cryptoUnlockPassword.value) || "ENG");
        });
    }
}
