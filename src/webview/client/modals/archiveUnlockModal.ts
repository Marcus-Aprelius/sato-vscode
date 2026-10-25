import { byId } from "../dom";
import { vscode } from "../globals";
import { closeModal, openModal } from "./modalLifecycle";
import { detectKeyboardLayoutFromText, setKeyboardLayout, updateCapsLockWarning, updateKeyboardLayoutFromEvent } from "./inputHints";

const PASSWORD_INPUT_ID = "archive-unlock-password";
const LAYOUT_INDICATOR_ID = "archive-unlock-layout";
const CAPS_LOCK_WARNING_ID = "archive-unlock-capslock-warning";
const ERROR_ID = "archive-unlock-error";

export function openArchiveUnlockModal(): void {
    const password = byId<HTMLInputElement>(PASSWORD_INPUT_ID);
    const error = byId<HTMLElement>(ERROR_ID);
    const capsWarning = byId<HTMLElement>(CAPS_LOCK_WARNING_ID);

    password.value = "";
    error.textContent = "";
    error.style.display = "none";
    capsWarning.style.display = "none";

    setKeyboardLayout(LAYOUT_INDICATOR_ID, "ENG");
    openModal("archive-unlock-modal");

    setTimeout(() => {password.focus();}, 0);
}

export function showArchiveUnlockError(
    message: string
): void {
    const password = byId<HTMLInputElement>(PASSWORD_INPUT_ID);
    const error = byId<HTMLElement>(ERROR_ID);

    password.value = "";
    error.textContent = message;
    error.style.display = "";

    setKeyboardLayout(LAYOUT_INDICATOR_ID, "ENG");
    password.focus();
}

export function bindArchiveUnlockModalActions(): void {
    byId("archive-unlock-cancel").addEventListener("click", closeArchiveUnlockModal);
    byId("archive-unlock-ok").addEventListener( "click", submitArchivePassword);

    const password = byId<HTMLInputElement>(PASSWORD_INPUT_ID);

    const updateInputHints = (event: KeyboardEvent): void => {
        updateKeyboardLayoutFromEvent(event, PASSWORD_INPUT_ID, LAYOUT_INDICATOR_ID);
        updateCapsLockWarning(event, CAPS_LOCK_WARNING_ID);
    };

    password.addEventListener("keydown", event => {
        updateInputHints(event);

        if (event.key === "Enter") {
            event.preventDefault();
            submitArchivePassword();
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeArchiveUnlockModal();
        }
    });

    password.addEventListener("keyup", updateInputHints);

    password.addEventListener("input", () => {
        const detected = detectKeyboardLayoutFromText(password.value);

        if (detected) {
            setKeyboardLayout(LAYOUT_INDICATOR_ID, detected);
        }
    });

    password.addEventListener("focus", () => {
        const detected = detectKeyboardLayoutFromText(password.value);
        setKeyboardLayout(LAYOUT_INDICATOR_ID, detected || "ENG");
    });

    password.addEventListener("blur", () => {byId<HTMLElement>(CAPS_LOCK_WARNING_ID).style.display = "none";});
}

export function closeArchiveUnlockModal(): void {
    const password = byId<HTMLInputElement>(PASSWORD_INPUT_ID);
    const error = byId<HTMLElement>(ERROR_ID);
    const capsWarning = byId<HTMLElement>(CAPS_LOCK_WARNING_ID);

    password.value = "";
    error.textContent = "";
    error.style.display = "none";
    capsWarning.style.display = "none";

    setKeyboardLayout(LAYOUT_INDICATOR_ID, "ENG");
    closeModal();
}

function submitArchivePassword(): void {
    const password = byId<HTMLInputElement>(PASSWORD_INPUT_ID);
    const value = password.value;

    if (!value) {
        showArchiveUnlockError("Enter the archive password.");

        return;
    }

    vscode.postMessage({type: "unlockArchive", password: value});
    password.value = "";
}
