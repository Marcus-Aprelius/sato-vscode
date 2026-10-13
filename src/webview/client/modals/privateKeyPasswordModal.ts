import { byId } from "../dom";
import { vscode } from "../globals";
import { generateWithDefaults, strengthOf } from "../generator";
import { closeModal, openModal } from "./modalLifecycle";
import { detectKeyboardLayoutFromText, setKeyboardLayout, updateCapsLockWarning, updateKeyboardLayoutFromEvent} from "./inputHints";

type PrivateKeyPasswordMode = | "set" | "change" | "remove";

const CURRENT_PASSWORD_ID = "private-key-current-password";
const NEW_PASSWORD_ID = "private-key-new-password";
const CONFIRM_PASSWORD_ID = "private-key-confirm-password";
const CAPS_WARNING_ID = "private-key-password-capslock-warning";
const ERROR_ID = "private-key-password-error";

let activeEntryId = "";
let activeMode: PrivateKeyPasswordMode = "change";

export function openPrivateKeyPasswordModal(
    entryId: string,
    mode: PrivateKeyPasswordMode
): void {
    activeEntryId = entryId;
    activeMode = mode;

    clearPrivateKeyPasswordFields();

    const title = byId<HTMLElement>("private-key-password-title");
    const currentRow = byId<HTMLElement>("private-key-current-password-row");
    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID);
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID);
    const saveButton = byId<HTMLButtonElement>("private-key-password-save");
    const settingPassword = mode === "set";
    const removingPassword = mode === "remove";

    title.textContent = settingPassword ? "Set Private Key Password" : removingPassword ? "Remove Private Key Password" : "Change Private Key Password";
    saveButton.textContent = settingPassword ? "Set Password" : removingPassword ? "Remove Password" : "Change Password";
    currentRow.style.display = settingPassword ? "none" : "";

    const newPasswordRows = [newPassword.closest("label"), confirmPassword.closest("label")];

    for (const row of newPasswordRows) {
        if (row instanceof HTMLElement) {
            row.style.display = removingPassword ? "none" : "";
        }
    }

    byId<HTMLElement>("private-key-password-strength-row").style.display = removingPassword ? "none" : "";
    openModal("private-key-password-modal");

    setTimeout(() => {
        if (settingPassword) {
            newPassword.focus();
        } else {
            byId<HTMLInputElement>(CURRENT_PASSWORD_ID).focus();
        }
    }, 0);
}

export function closePrivateKeyPasswordModal(): void {
    clearPrivateKeyPasswordFields();

    activeEntryId = "";
    activeMode = "change";

    closeModal();
}

export function showPrivateKeyPasswordError(
    message: string
): void {
    const error = byId<HTMLElement>(ERROR_ID);

    error.textContent = message;
    error.style.display = "";
}

export function bindPrivateKeyPasswordModalActions(): void {
    byId("private-key-password-cancel").addEventListener("click", closePrivateKeyPasswordModal);
    byId("private-key-password-save").addEventListener("click", submitPrivateKeyPasswordChange);
    byId("private-key-password-generate").addEventListener("click", generatePrivateKeyPassword);
    bindPasswordToggle(CURRENT_PASSWORD_ID, "private-key-current-password-toggle");
    bindPasswordToggle(NEW_PASSWORD_ID, "private-key-new-password-toggle");
    bindPasswordToggle(CONFIRM_PASSWORD_ID, "private-key-confirm-password-toggle");
    bindPasswordInput(CURRENT_PASSWORD_ID, "private-key-current-password-layout");
    bindPasswordInput(NEW_PASSWORD_ID, "private-key-new-password-layout");
    bindPasswordInput(CONFIRM_PASSWORD_ID, "private-key-confirm-password-layout");
}

function bindPasswordInput(
    inputId: string,
    layoutId: string
): void {
    const input = byId<HTMLInputElement>(inputId);

    const updateHints = (event: KeyboardEvent): void => {
        updateKeyboardLayoutFromEvent(event, inputId, layoutId);
        updateCapsLockWarning(event, CAPS_WARNING_ID);
    };

    input.addEventListener("keydown", event => {
        updateHints(event);

        if (event.key === "Escape") {
            event.preventDefault();
            closePrivateKeyPasswordModal();
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();

            if (inputId === CURRENT_PASSWORD_ID) {
                byId<HTMLInputElement>(NEW_PASSWORD_ID).focus();
                return;
            }

            if (inputId === NEW_PASSWORD_ID) {
                byId<HTMLInputElement>(CONFIRM_PASSWORD_ID).focus();
                return;
            }

            submitPrivateKeyPasswordChange();
        }
    });

    input.addEventListener("keyup", updateHints);

    input.addEventListener("input", () => {
        const detected = detectKeyboardLayoutFromText(input.value);

        if (detected) {
            setKeyboardLayout(layoutId, detected);
        }

        if (inputId === NEW_PASSWORD_ID) {
            updatePrivateKeyPasswordStrength(input.value);
        }

        hideError();
    });

    input.addEventListener("focus", () => {setKeyboardLayout(layoutId, detectKeyboardLayoutFromText(input.value) || "ENG");});
    input.addEventListener("blur", () => {byId<HTMLElement>(CAPS_WARNING_ID).style.display = "none";});
}

function bindPasswordToggle(
    inputId: string,
    buttonId: string
): void {
    byId(buttonId).addEventListener("click", () => {
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
    });
}

function submitPrivateKeyPasswordChange(): void {
    if (!activeEntryId) {
        return;
    }

    const currentPassword = byId<HTMLInputElement>(CURRENT_PASSWORD_ID).value;

    if (activeMode === "remove") {
        if (!currentPassword) {
            showPrivateKeyPasswordError("Enter the current private key password.");
            return;
        }

        vscode.postMessage({type: "deletePrivateKeyPassword", entryId: activeEntryId, currentPassword});
        return;
    }

    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID).value;
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID).value;

    if (activeMode === "change" && !currentPassword) {
        showPrivateKeyPasswordError("Enter the current private key password.");
        return;
    }

    if (!newPassword) {
        showPrivateKeyPasswordError("Enter a new private key password.");
        return;
    }

    if (newPassword !== confirmPassword) {
        showPrivateKeyPasswordError("Passwords do not match.");
        return;
    }

    vscode.postMessage({type: "changePrivateKeyPassword", entryId: activeEntryId, currentPassword, newPassword});
}

function generatePrivateKeyPassword(): void {
    const password = generateWithDefaults();
    const newPassword = byId<HTMLInputElement>(NEW_PASSWORD_ID);
    const confirmPassword = byId<HTMLInputElement>(CONFIRM_PASSWORD_ID);

    newPassword.value = password;
    confirmPassword.value = password;

    updatePrivateKeyPasswordStrength(password);
    hideError();

    newPassword.focus();
    newPassword.select();
}

function updatePrivateKeyPasswordStrength(
    password: string
): void {
    const container = byId<HTMLElement>("private-key-password-strength");
    const bar = byId<HTMLElement>("private-key-password-strength-bar");
    const label = byId<HTMLElement>("private-key-password-strength-label");

    if (!password) {
        container.style.visibility = "hidden";

        bar.style.setProperty("--pct", "0%");
        bar.style.setProperty("--color", "transparent");

        label.textContent = "";
        label.style.color = "";

        return;
    }

    const strength = strengthOf(password);
    container.style.visibility = "visible";

    bar.style.setProperty("--pct", `${strength.pct}%`);
    bar.style.setProperty("--color", strength.color);

    label.textContent = strength.label;
    label.style.color = strength.color;
}

function clearPrivateKeyPasswordFields(): void {
    const fields = [
        {
            inputId: CURRENT_PASSWORD_ID,
            layoutId: "private-key-current-password-layout",
            toggleId: "private-key-current-password-toggle"
        },
        {
            inputId: NEW_PASSWORD_ID,
            layoutId: "private-key-new-password-layout",
            toggleId: "private-key-new-password-toggle"
        },
        {
            inputId: CONFIRM_PASSWORD_ID,
            layoutId: "private-key-confirm-password-layout",
            toggleId: "private-key-confirm-password-toggle"
        }
    ];

    for (const field of fields) {
        const input = byId<HTMLInputElement>(field.inputId);

        input.value = "";
        input.type = "password";

        setKeyboardLayout(field.layoutId, "ENG");
        resetPasswordToggle(field.toggleId);
    }

    byId<HTMLElement>(CAPS_WARNING_ID).style.display = "none";
    byId<HTMLElement>("private-key-password-strength-row").style.display = "";

    updatePrivateKeyPasswordStrength("");
    hideError();
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

function hideError(): void {
    const error = byId<HTMLElement>(ERROR_ID);

    error.textContent = "";
    error.style.display = "none";
}
