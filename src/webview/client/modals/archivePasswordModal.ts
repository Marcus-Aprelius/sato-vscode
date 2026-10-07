import { byId } from "../dom";
import { vscode } from "../globals";
import { closeModal, openModal} from "./modalLifecycle";
import { detectKeyboardLayoutFromText, setKeyboardLayout, updateCapsLockWarning, updateKeyboardLayoutFromEvent } from "./inputHints";

const NEW_PASSWORD_ID = "archive-new-password";
const CONFIRM_PASSWORD_ID = "archive-confirm-password";
const LAYOUT_ID = "archive-new-password-layout";
const CAPS_WARNING_ID = "archive-password-capslock-warning";
const ERROR_ID = "archive-password-error";

export function openArchivePasswordModal(): void {
    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID);
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID);
    const error = byId<HTMLElement>(ERROR_ID);

    newPassword.value = "";
    confirmPassword.value = "";
    error.textContent = "";
    error.style.display = "none";

    const capsWarning = document.getElementById(CAPS_WARNING_ID);

    if (capsWarning) {
        capsWarning.style.display = "none";
    }

    setKeyboardLayout(LAYOUT_ID, "ENG");
    openModal("archive-password-modal");
    setTimeout(() => {newPassword.focus();}, 0);
}

export function closeArchivePasswordModal(): void {
    clearArchivePasswordModal();
    closeModal();
}

export function showArchivePasswordError(
    message: string
): void {
    const error = byId<HTMLElement>(ERROR_ID);

    error.textContent = message;
    error.style.display = "";

    byId<HTMLInputElement>(NEW_PASSWORD_ID).focus();
}

export function bindArchivePasswordModalActions(): void {
    byId("archive-password-cancel").addEventListener("click", closeArchivePasswordModal);
    byId("archive-password-save").addEventListener("click", submitArchivePasswordChange);

    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID);
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID);

    bindPasswordInputHints(newPassword);

    confirmPassword.addEventListener("keydown", event => {
        updatePasswordInputHints(event);

        if (event.key === "Enter") {
            event.preventDefault();
            submitArchivePasswordChange();
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeArchivePasswordModal();
        }
    });

    confirmPassword.addEventListener("keyup", updatePasswordInputHints);

    confirmPassword.addEventListener("input",() => {
        const detected = detectKeyboardLayoutFromText(confirmPassword.value);

        if (detected) {
            setKeyboardLayout(LAYOUT_ID, detected);
        }
    });
}

function bindPasswordInputHints(
    input: HTMLInputElement
): void {
    input.addEventListener("keydown", event => {
        updatePasswordInputHints(event);

        if (event.key === "Enter") {
            event.preventDefault();

            byId<HTMLInputElement>(CONFIRM_PASSWORD_ID).focus();
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeArchivePasswordModal();
        }
    });

    input.addEventListener("keyup", updatePasswordInputHints);

    input.addEventListener("input", () => {
        const detected = detectKeyboardLayoutFromText(input.value);

        if (detected) {
            setKeyboardLayout(LAYOUT_ID, detected);
        }
    });

    input.addEventListener("focus", () => {setKeyboardLayout(LAYOUT_ID, detectKeyboardLayoutFromText(input.value) || "ENG");});
}

function updatePasswordInputHints(
    event: KeyboardEvent
): void {
    updateKeyboardLayoutFromEvent(event, event.target === byId<HTMLInputElement>(CONFIRM_PASSWORD_ID) ? CONFIRM_PASSWORD_ID : NEW_PASSWORD_ID, LAYOUT_ID);

    const capsWarning = document.getElementById(CAPS_WARNING_ID);

    if (capsWarning) {
        updateCapsLockWarning(event, CAPS_WARNING_ID);
    }
}

function submitArchivePasswordChange(): void {
    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID).value;
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID).value;

    if (!newPassword) {
        showArchivePasswordError("Enter a new archive password.");

        return;
    }

    if (newPassword !== confirmPassword) {
        showArchivePasswordError("Passwords do not match.");

        return;
    }

    vscode.postMessage({type: "changeArchivePassword", password: newPassword});
}

function clearArchivePasswordModal(): void {
    byId<HTMLInputElement>(NEW_PASSWORD_ID).value = "";
    byId<HTMLInputElement>(CONFIRM_PASSWORD_ID).value = "";

    const error = byId<HTMLElement>(ERROR_ID);
    error.textContent = "";
    error.style.display = "none";
    const capsWarning = document.getElementById(CAPS_WARNING_ID);

    if (capsWarning) {
        capsWarning.style.display = "none";
    }

    setKeyboardLayout(LAYOUT_ID, "ENG");
}
