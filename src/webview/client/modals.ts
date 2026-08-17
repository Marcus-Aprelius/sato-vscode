

import type { EntryFormFields } from "./types";
import { byId, maybeById } from "./dom";
import { vscode } from "./globals";
import { app, entryIndex } from "./state";
import { generateWithDefaults, updateEntryStrength } from "./generator";

let cryptoUnlockEntryId: string | null = null;

export function openModal(id: string): void {
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.classList.remove("open");
    });

    byId(id).classList.add("open");
    byId("modal-backdrop").classList.add("open");
}

export function closeModal(): void {
    byId("modal-backdrop").classList.remove("open");

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.classList.remove("open");
    });

    app.editingEntryId = null;
    app.editingGroupId = null;
    cryptoUnlockEntryId = null;
}

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

    vscode.postMessage({
        type: "unlockWithPassword",
        password
    });
}

export function openCryptoContainerUnlockModal(entryId: string): void {
    cryptoUnlockEntryId = entryId;

    const password = maybeById<HTMLInputElement>("crypto-unlock-password");
    const error = maybeById<HTMLElement>("crypto-unlock-error");
    const capsWarning = maybeById<HTMLElement>("crypto-unlock-capslock-warning");

    if (password) {
        password.value = "";
    }

    if (error) {
        error.textContent = "";
        error.style.display = "none";
    }

    if (capsWarning) {
        capsWarning.style.display = "none";
    }

    setCryptoKeyboardLayout("ENG");

    openModal("crypto-unlock-modal");

    setTimeout(() => {
        const input = maybeById<HTMLInputElement>("crypto-unlock-password");

        if (input) {
            input.focus();
        }
    }, 0);
}

export function closeCryptoContainerUnlockModal(): void {
    const password = maybeById<HTMLInputElement>("crypto-unlock-password");
    const error = maybeById<HTMLElement>("crypto-unlock-error");

    if (password) {
        password.value = "";
    }

    if (error) {
        error.textContent = "";
        error.style.display = "none";
    }

    cryptoUnlockEntryId = null;
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

export function submitCryptoContainerPassword(): void {
    const input = maybeById<HTMLInputElement>("crypto-unlock-password");

    if (!input || !cryptoUnlockEntryId) {
        return;
    }

    const password = input.value;

    if (!password) {
        input.focus();
        return;
    }

    vscode.postMessage({
        type: "unlockCryptoContainer",
        entryId: cryptoUnlockEntryId,
        password
    });
}

export function setKeyboardLayout(layout: string): void {
    const element = maybeById<HTMLElement>("unlock-layout");

    if (!element) {
        return;
    }

    element.textContent = layout;
    element.classList.toggle("ru", layout === "РУС");
    element.classList.toggle("eng", layout === "ENG");
}

function setCryptoKeyboardLayout(layout: string): void {
    const element = maybeById<HTMLElement>("crypto-unlock-layout");

    if (!element) {
        return;
    }

    element.textContent = layout;
    element.classList.toggle("ru", layout === "РУС");
    element.classList.toggle("eng", layout === "ENG");
}

function detectKeyboardLayoutFromText(value: string): string | null {
    for (let i = value.length - 1; i >= 0; i--) {
        const char = value.charAt(i);

        if (/[A-Za-z]/.test(char)) {
            return "ENG";
        }

        if (/[А-Яа-яЁёІіЇїЄєҐґ]/.test(char)) {
            return "РУС";
        }
    }

    return null;
}

function updateKeyboardLayoutFromEvent(event: KeyboardEvent): void {
    const key = event.key || "";

    if (/^[A-Za-z]$/.test(key)) {
        setKeyboardLayout("ENG");
        return;
    }

    if (/^[А-Яа-яЁёІіЇїЄєҐґ]$/.test(key)) {
        setKeyboardLayout("РУС");
        return;
    }

    const input = maybeById<HTMLInputElement>("unlock-password");

    if (!input) {
        return;
    }

    const detected = detectKeyboardLayoutFromText(input.value);

    if (detected) {
        setKeyboardLayout(detected);
    }
}

function updateCapsLockWarning(event: KeyboardEvent): void {
    const warning = maybeById<HTMLElement>("unlock-capslock-warning");

    if (!warning) {
        return;
    }

    const isOn = typeof event.getModifierState === "function"
        ? event.getModifierState("CapsLock")
        : false;

    warning.style.display = isOn ? "" : "none";
}

function updateCryptoCapsLockWarning(event: KeyboardEvent): void {
    const warning = maybeById<HTMLElement>("crypto-unlock-capslock-warning");

    if (!warning) {
        return;
    }

    const isOn = typeof event.getModifierState === "function"
        ? event.getModifierState("CapsLock")
        : false;

    warning.style.display = isOn ? "" : "none";
}

function updateCryptoKeyboardLayoutFromEvent(event: KeyboardEvent): void {
    const key = event.key || "";

    if (/^[A-Za-z]$/.test(key)) {
        setCryptoKeyboardLayout("ENG");
        return;
    }

    if (/^[А-Яа-яЁёІіЇїЄєҐґ]$/.test(key)) {
        setCryptoKeyboardLayout("РУС");
        return;
    }

    const input = maybeById<HTMLInputElement>("crypto-unlock-password");

    if (!input) {
        return;
    }

    const detected = detectKeyboardLayoutFromText(input.value);

    if (detected) {
        setCryptoKeyboardLayout(detected);
    }
}

function updateCryptoUnlockInputHints(event: KeyboardEvent): void {
    updateCryptoKeyboardLayoutFromEvent(event);
    updateCryptoCapsLockWarning(event);
}

function updateUnlockInputHints(event: KeyboardEvent): void {
    updateKeyboardLayoutFromEvent(event);
    updateCapsLockWarning(event);
}

export function openEntryModal(entryId: string | null, groupId?: string): void {
    if (app.vaultLocked) {
        return;
    }

    const entry = entryId ? entryIndex.get(entryId) : undefined;

    if (entry && entry.readOnly) {
        return;
    }

    app.editingEntryId = entryId || null;
    app.editingGroupId = groupId || app.selectedGroupId;

    byId("entry-modal-title").textContent = entryId ? "Edit Entry" : "New Entry";

    byId<HTMLInputElement>("ef-title").value = "";
    byId<HTMLInputElement>("ef-username").value = "";
    byId<HTMLInputElement>("ef-password").value = "";
    byId<HTMLInputElement>("ef-password").type = "password";
    byId("ef-toggle").textContent = "Show";
    byId<HTMLInputElement>("ef-url").value = "";
    byId<HTMLTextAreaElement>("ef-notes").value = "";

    updateEntryStrength();
    openModal("entry-modal");

    if (entryId) {
        vscode.postMessage({
            type: "getEntryDetail",
            entryId
        });
    } else {
        byId<HTMLInputElement>("ef-title").focus();
    }
}

export function fillEntryModal(detail: EntryFormFields): void {
    byId<HTMLInputElement>("ef-title").value = detail.title;
    byId<HTMLInputElement>("ef-username").value = detail.username;
    byId<HTMLInputElement>("ef-password").value = detail.password;
    byId<HTMLInputElement>("ef-url").value = detail.url;
    byId<HTMLTextAreaElement>("ef-notes").value = detail.notes;

    updateEntryStrength();
    byId<HTMLInputElement>("ef-title").focus();
}

export function bindModalActions(): void {
    byId("modal-backdrop").addEventListener("click", (event) => {
        if (event.target === byId("modal-backdrop")) {
            closeModal();
        }
    });

    maybeById("ef-cancel")?.addEventListener("click", closeModal);

    maybeById("ef-toggle")?.addEventListener("click", () => {
        const password = byId<HTMLInputElement>("ef-password");
        const toggle = byId("ef-toggle");

        if (password.type === "password") {
            password.type = "text";
            toggle.textContent = "Hide";
        } else {
            password.type = "password";
            toggle.textContent = "Show";
        }
    });

    maybeById("ef-password")?.addEventListener("input", updateEntryStrength);

    maybeById("ef-generate")?.addEventListener("click", () => {
        byId<HTMLInputElement>("ef-password").value = generateWithDefaults();
        updateEntryStrength();
    });

    maybeById("ef-save")?.addEventListener("click", () => {
        const fields: EntryFormFields = {
            title: byId<HTMLInputElement>("ef-title").value.trim(),
            username: byId<HTMLInputElement>("ef-username").value,
            password: byId<HTMLInputElement>("ef-password").value,
            url: byId<HTMLInputElement>("ef-url").value,
            notes: byId<HTMLTextAreaElement>("ef-notes").value
        };

        if (!fields.title) {
            byId<HTMLInputElement>("ef-title").focus();
            return;
        }

        if (app.editingEntryId) {
            vscode.postMessage({
                type: "updateEntry",
                entryId: app.editingEntryId,
                fields
            });
        } else {
            vscode.postMessage({
                type: "createEntry",
                groupId: app.editingGroupId,
                fields
            });
        }

        closeModal();
    });

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

    maybeById("crypto-unlock-cancel")?.addEventListener(
        "click",
        closeCryptoContainerUnlockModal
    );

    maybeById("crypto-unlock-ok")?.addEventListener(
        "click",
        submitCryptoContainerPassword
    );

    const cryptoUnlockPassword =
        maybeById<HTMLInputElement>("crypto-unlock-password");

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
        });

        cryptoUnlockPassword.addEventListener("focus", () => {
            setCryptoKeyboardLayout(
                detectKeyboardLayoutFromText(cryptoUnlockPassword.value) || "ENG"
            );
        });
    }

    maybeById("dbinfo-close")?.addEventListener("click", closeModal);
    maybeById("about-close")?.addEventListener("click", closeModal);
}
