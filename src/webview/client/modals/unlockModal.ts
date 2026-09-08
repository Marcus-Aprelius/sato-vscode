import { vscode } from "../globals";
import { maybeById } from "../dom";
import { closeModal, openModal } from "./modalLifecycle";

import {
    detectKeyboardLayoutFromText,
    setKeyboardLayout as setInputKeyboardLayout,
    updateCapsLockWarning,
    updateKeyboardLayoutFromEvent
} from "./inputHints";

export function openUnlockModal(): void {
    const password = maybeById<HTMLInputElement>("unlock-password");
    const error = maybeById<HTMLElement>("unlock-error");

    if (password) {
        password.value = "";
        setKeyboardLayout("ENG");

        const capsWarning = maybeById<HTMLElement>("unlock-capslock-warning");

        if (capsWarning) {
            capsWarning.style.display = "none";
        }
    }

    if (error) {
        error.style.display = "none";
        error.textContent = "";
    }

    openModal("unlock-modal");

    setTimeout(() => {
        const input = maybeById<HTMLInputElement>("unlock-password");

        if (input) {
            input.focus();
        }
    }, 0);
}

export function closeUnlockModal(): void {
    const password = maybeById<HTMLInputElement>("unlock-password");
    const error = maybeById<HTMLElement>("unlock-error");

    if (password) {
        password.value = "";
    }

    if (error) {
        error.style.display = "none";
        error.textContent = "";
    }

    closeModal();
}

export function submitUnlockPassword(): void {
    const input = maybeById<HTMLInputElement>("unlock-password");

    if (!input) {
        return;
    }

    const password = input.value;

    if (!password) {
        input.focus();
        return;
    }

    vscode.postMessage({type: "unlockWithPassword", password});
}

export function setKeyboardLayout(layout: string): void {
    setInputKeyboardLayout("unlock-layout", layout);
}

function updateUnlockInputHints(event: KeyboardEvent): void {
    updateKeyboardLayoutFromEvent(event, "unlock-password", "unlock-layout");
    updateCapsLockWarning(event, "unlock-capslock-warning");
}

export function bindUnlockModalActions(): void {
    maybeById("unlock-cancel")?.addEventListener("click", closeUnlockModal);
    maybeById("unlock-ok")?.addEventListener("click", submitUnlockPassword);

    const unlockPassword = maybeById<HTMLInputElement>("unlock-password");

    if (unlockPassword) {
        unlockPassword.addEventListener("keydown", (event) => {
            updateUnlockInputHints(event);

            if (event.key === "Enter") {
                submitUnlockPassword();
            }

            if (event.key === "Escape") {
                closeUnlockModal();
            }
        });

        unlockPassword.addEventListener("keyup", updateUnlockInputHints);

        unlockPassword.addEventListener("input", () => {
            const detected = detectKeyboardLayoutFromText(unlockPassword.value);

            if (detected) {
                setKeyboardLayout(detected);
            }
        });

        unlockPassword.addEventListener("focus", () => {
            setKeyboardLayout(detectKeyboardLayoutFromText(unlockPassword.value) || "ENG");
        });
    }
}
   