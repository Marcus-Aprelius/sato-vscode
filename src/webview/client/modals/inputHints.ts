import { maybeById } from "../dom";

export function detectKeyboardLayoutFromText(
    value: string
): string | null {
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

export function setKeyboardLayout(
    elementId: string,
    layout: string
): void {
    const element = maybeById<HTMLElement>(
        elementId
    );

    if (!element) {
        return;
    }

    element.textContent = layout;
    element.classList.toggle("ru", layout === "РУС");
    element.classList.toggle("eng", layout === "ENG");
}

export function updateKeyboardLayoutFromEvent(
    event: KeyboardEvent,
    inputId: string,
    indicatorId: string
): void {
    const key = event.key || "";

    if (/^[A-Za-z]$/.test(key)) {
        setKeyboardLayout(indicatorId,"ENG");

        return;
    }

    if (/^[А-Яа-яЁёІіЇїЄєҐґ]$/.test(key)) {
        setKeyboardLayout(indicatorId,"РУС");

        return;
    }

    const input = maybeById<HTMLInputElement>(
        inputId
    );

    if (!input) {
        return;
    }

    const detected = detectKeyboardLayoutFromText(input.value);

    if (detected) {
        setKeyboardLayout(indicatorId, detected);
    }
}

export function updateCapsLockWarning(
    event: KeyboardEvent,
    warningId: string
): void {
    const warning = maybeById<HTMLElement>(warningId);

    if (!warning) {
        return;
    }

    const isOn =
        typeof event.getModifierState === "function"
            ? event.getModifierState("CapsLock")
            : false;

    warning.style.display = isOn ? "" : "none";
}
