
import { vscode } from "./globals";
import { byId, maybeById } from "./dom";
import { app, entryIndex } from "./state";
import { generateWithDefaults, updateEntryStrength } from "./generator";

import type { EntryFormFields } from "./types";

let openPgpPrivateKeyPath = "";
let cryptoUnlockRequiresPrivateKey = false;
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
    openPgpPrivateKeyPath = "";

    const entry = entryIndex.get(entryId);

    cryptoUnlockRequiresPrivateKey =
        entry?.values?.Type === "OpenPGP Encrypted Message";

    const title = maybeById<HTMLElement>("crypto-unlock-title");
    const label = maybeById<HTMLElement>(
        "crypto-unlock-password-label"
    );
    const keyRow = maybeById<HTMLElement>(
        "crypto-unlock-key-row"
    );
    const keyPath = maybeById<HTMLInputElement>(
        "crypto-unlock-key-path"
    );
    const password = maybeById<HTMLInputElement>(
        "crypto-unlock-password"
    );
    const error = maybeById<HTMLElement>(
        "crypto-unlock-error"
    );
    const capsWarning = maybeById<HTMLElement>(
        "crypto-unlock-capslock-warning"
    );

    if (title) {
        title.textContent = cryptoUnlockRequiresPrivateKey
            ? "Decrypt OpenPGP Message"
            : "Unlock Crypto Container";
    }

    if (label) {
        label.textContent = cryptoUnlockRequiresPrivateKey
            ? "OpenPGP passphrase"
            : "Container password";
    }

    if (keyRow) {
        keyRow.style.display = cryptoUnlockRequiresPrivateKey
            ? ""
            : "none";
    }

    if (password) {
        password.value = "";
    }

    if (keyPath) {
        const detectedPath = cryptoUnlockRequiresPrivateKey
            ? findOpenPgpPrivateKeyPath()
            : "";

        openPgpPrivateKeyPath = detectedPath;
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
        password?.focus();
    }, 0);
}

export function closeCryptoContainerUnlockModal(): void {
    const password = maybeById<HTMLInputElement>(
        "crypto-unlock-password"
    );
    const keyPath = maybeById<HTMLInputElement>(
        "crypto-unlock-key-path"
    );
    const error = maybeById<HTMLElement>(
        "crypto-unlock-error"
    );
    const capsWarning = maybeById<HTMLElement>(
        "crypto-unlock-capslock-warning"
    );

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

    cryptoUnlockEntryId = null;
    openPgpPrivateKeyPath = "";
    cryptoUnlockRequiresPrivateKey = false;

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

export function setOpenPgpPrivateKeyPath(
    entryId: string,
    filePath: string
): void {
    if (
        !cryptoUnlockEntryId ||
        cryptoUnlockEntryId !== entryId
    ) {
        return;
    }

    openPgpPrivateKeyPath = filePath;

    const input = maybeById<HTMLInputElement>(
        "crypto-unlock-key-path"
    );

    if (input) {
        input.value = filePath;
    }

    const error = maybeById<HTMLElement>(
        "crypto-unlock-error"
    );

    if (error) {
        error.textContent = "";
        error.style.display = "none";
    }

    updateCryptoUnlockOkState();
}

export function submitCryptoContainerPassword(): void {
    const input = maybeById<HTMLInputElement>(
        "crypto-unlock-password"
    );

    if (!input || !cryptoUnlockEntryId) {
        return;
    }

    const password = input.value;

    if (!password) {
        input.focus();
        return;
    }

    if (
        cryptoUnlockRequiresPrivateKey &&
        !openPgpPrivateKeyPath
    ) {
        showCryptoContainerUnlockError(
            "Select an OpenPGP private key file."
        );
        return;
    }

    vscode.postMessage({
        type: "unlockCryptoContainer",
        entryId: cryptoUnlockEntryId,
        password,
        privateKeyPath: cryptoUnlockRequiresPrivateKey
            ? openPgpPrivateKeyPath
            : undefined
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

function updateCryptoUnlockOkState(): void {
    const password = maybeById<HTMLInputElement>(
        "crypto-unlock-password"
    );
    const ok = maybeById<HTMLButtonElement>(
        "crypto-unlock-ok"
    );

    if (!ok) {
        return;
    }

    const hasPassword = !!password?.value;

    const hasRequiredKey =
        !cryptoUnlockRequiresPrivateKey ||
        !!openPgpPrivateKeyPath;

    ok.disabled = !hasPassword || !hasRequiredKey;
}

function findOpenPgpPrivateKeyPath(): string {
    for (const entry of entryIndex.values()) {
        if (
            entry.values?.Type === "OpenPGP Private Key" &&
            entry.values["File path"]
        ) {
            return entry.values["File path"];
        }
    }

    return "";
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

    maybeById("crypto-unlock-key-browse")?.addEventListener(
        "click",
        () => {
            if (!cryptoUnlockEntryId) {
                return;
            }

            vscode.postMessage({
                type: "selectOpenPgpPrivateKey",
                entryId: cryptoUnlockEntryId
            });
        }
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

            updateCryptoUnlockOkState();
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
