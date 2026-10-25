import { byId } from "../dom";
import { vscode } from "../globals";
import { closeModal, openModal } from "./modalLifecycle";
import { generateWithDefaults, strengthOf } from "../generator";
import { detectKeyboardLayoutFromText, setKeyboardLayout, updateCapsLockWarning, updateKeyboardLayoutFromEvent } from "./inputHints";

const NEW_PASSWORD_ID = "archive-new-password";
const CONFIRM_PASSWORD_ID = "archive-confirm-password";
const NEW_PASSWORD_LAYOUT_ID = "archive-new-password-layout";
const CONFIRM_PASSWORD_LAYOUT_ID = "archive-confirm-password-layout";
const CAPS_WARNING_ID = "archive-password-capslock-warning";
const ERROR_ID = "archive-password-error";
const STRENGTH_BAR_ID = "archive-password-strength-bar";
const STRENGTH_LABEL_ID = "archive-password-strength-label";

type ArchivePasswordMode = | "set" | "change";

export function openArchivePasswordModal(mode: ArchivePasswordMode = "change"): void {
    const settingPassword = mode === "set";

    byId("archive-password-title").textContent = settingPassword ? "Set Archive Password" : "Change Archive Password";
    byId<HTMLButtonElement>("archive-password-save").textContent = settingPassword ? "Set Password" : "Change Password";

    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID);
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID);
    const error = byId<HTMLElement>(ERROR_ID);
    const capsWarning = byId<HTMLElement>(CAPS_WARNING_ID);

    newPassword.value = "";
    newPassword.type = "password";
    confirmPassword.value = "";
    confirmPassword.type = "password";
    error.textContent = "";
    error.style.display = "none";
    capsWarning.style.display = "none";

    resetPasswordToggle("archive-new-password-toggle");
    resetPasswordToggle("archive-confirm-password-toggle");
    setKeyboardLayout(NEW_PASSWORD_LAYOUT_ID, "ENG");
    setKeyboardLayout(CONFIRM_PASSWORD_LAYOUT_ID, "ENG");
    updateArchivePasswordStrength("");
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
    byId("archive-password-generate").addEventListener("click", generateArchivePassword);
    byId("archive-new-password-toggle").addEventListener("click", () => {togglePasswordVisibility(NEW_PASSWORD_ID, "archive-new-password-toggle");});
    byId("archive-confirm-password-toggle").addEventListener("click", () => {togglePasswordVisibility(CONFIRM_PASSWORD_ID, "archive-confirm-password-toggle");});

    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID);
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID);

    bindPasswordInputHints(newPassword, NEW_PASSWORD_LAYOUT_ID, true);
    bindPasswordInputHints(confirmPassword, CONFIRM_PASSWORD_LAYOUT_ID, false);
}

function bindPasswordInputHints(
    input: HTMLInputElement,
    layoutId: string,
    moveToConfirmationOnEnter: boolean
): void {
    const updateInputHints = (event: KeyboardEvent): void => {
        updateKeyboardLayoutFromEvent(event, input.id, layoutId);
        updateCapsLockWarning(event, CAPS_WARNING_ID);
    };

    input.addEventListener("keydown", event => {updateInputHints(event);

        if (event.key === "Enter") {
            event.preventDefault();

            if (moveToConfirmationOnEnter) {
                byId<HTMLInputElement>(CONFIRM_PASSWORD_ID).focus();
            } else {
                submitArchivePasswordChange();
            }
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeArchivePasswordModal();
        }
    });

    input.addEventListener("keyup", updateInputHints);
    input.addEventListener("input", () => {const detected = detectKeyboardLayoutFromText(input.value);

            if (detected) {
                setKeyboardLayout(layoutId, detected);
            }

            if (input.id === NEW_PASSWORD_ID) {
                updateArchivePasswordStrength(input.value);
            }

            hideArchivePasswordError();
        }
    );

    input.addEventListener("focus", () => {setKeyboardLayout(layoutId, detectKeyboardLayoutFromText(input.value) || "ENG");});
    input.addEventListener("blur", () => {byId<HTMLElement>(CAPS_WARNING_ID).style.display = "none";});
}

function generateArchivePassword(): void {
    const password = generateWithDefaults();
    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID);
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID);

    newPassword.value = password;
    confirmPassword.value = password;

    updateArchivePasswordStrength(password);
    hideArchivePasswordError();

    newPassword.focus();
    newPassword.select();
}

function togglePasswordVisibility(
    inputId: string,
    buttonId: string
): void {
    const input = byId<HTMLInputElement>(inputId);
    const button = byId<HTMLButtonElement>(buttonId);
    const icon = button.querySelector(".codicon");
    const show = input.type === "password";

    input.type = show ? "text" : "password";
    button.title = show ? "Hide password" : "Show password";
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", String(show));

    if (icon) {
        icon.className = show ? "codicon codicon-eye-closed" : "codicon codicon-eye";
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

function resetPasswordToggle(
    buttonId: string
): void {
    const button = byId<HTMLButtonElement>(buttonId);
    const icon = button.querySelector(".codicon");

    button.title = "Show password";
    button.setAttribute("aria-label", "Show password");
    button.setAttribute("aria-pressed", "false");

    if (icon) {
        icon.className = "codicon codicon-eye";
    }
}

function updateArchivePasswordStrength(
    password: string
): void {
    const strengthContainer = byId<HTMLElement>("archive-password-strength");
    const bar = byId<HTMLElement>(STRENGTH_BAR_ID);
    const label = byId<HTMLElement>(STRENGTH_LABEL_ID);

    if (!password) {
        strengthContainer.style.visibility = "hidden";
        bar.style.setProperty("--pct", "0%");
        bar.style.setProperty("--color", "transparent");

        label.textContent = "";
        label.style.color = "";

        return;
    }

    const strength = strengthOf(password);

    strengthContainer.style.visibility = "visible";
    bar.style.setProperty("--pct", `${strength.pct}%`);
    bar.style.setProperty("--color", strength.color);

    label.textContent = strength.label;
    label.style.color = strength.color;
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

function hideArchivePasswordError(): void {
    const error = byId<HTMLElement>(ERROR_ID);

    error.textContent = "";
    error.style.display = "none";
}

function clearArchivePasswordModal(): void {
    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID);
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID);

    newPassword.value = "";
    newPassword.type = "password";
    confirmPassword.value = "";
    confirmPassword.type = "password";

    hideArchivePasswordError();
    byId<HTMLElement>(CAPS_WARNING_ID).style.display = "none";
    resetPasswordToggle("archive-new-password-toggle");
    resetPasswordToggle("archive-confirm-password-toggle");
    setKeyboardLayout(NEW_PASSWORD_LAYOUT_ID, "ENG");
    setKeyboardLayout(CONFIRM_PASSWORD_LAYOUT_ID, "ENG");
    updateArchivePasswordStrength("");
}
