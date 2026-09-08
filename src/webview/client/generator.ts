import { app } from "./state";
import { vscode } from "./globals";
import { closeModal } from "./modals";
import { byId, maybeById } from "./dom";

interface GeneratorOptions {
    length: number;
    upper: boolean;
    lower: boolean;
    digits: boolean;
    symbols: boolean;
}

export function strengthOf(password: string): {
    pct: number;
    color: string;
    label: string;
} {
    if (!password) {
        return {
            pct: 0,
            color: "#666",
            label: "empty"
        };
    }

    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
        { pct: 15, color: "#d16969", label: "very weak" },
        { pct: 30, color: "#d19a66", label: "weak" },
        { pct: 50, color: "#d1c66a", label: "fair" },
        { pct: 70, color: "#a3d16a", label: "good" },
        { pct: 85, color: "#6ad189", label: "strong" },
        { pct: 100, color: "#4ec9b0", label: "very strong" }
    ];

    return levels[Math.min(score, levels.length - 1)];
}

export function updateEntryStrength(): void {
    const password = maybeById<HTMLInputElement>("ef-password");
    const bar = maybeById<HTMLElement>("ef-strength-bar");
    const label = maybeById<HTMLElement>("ef-strength-label");

    if (!password || !bar || !label) {
        return;
    }

    const strength = strengthOf(password.value);

    bar.style.setProperty("--pct", strength.pct + "%");
    bar.style.setProperty("--color", strength.color);
    label.textContent = strength.label;
}

function currentGenOptions(): GeneratorOptions {
    return {
        length: parseInt(byId<HTMLInputElement>("gen-length").value, 10),
        upper: byId<HTMLInputElement>("gen-upper").checked,
        lower: byId<HTMLInputElement>("gen-lower").checked,
        digits: byId<HTMLInputElement>("gen-digits").checked,
        symbols: byId<HTMLInputElement>("gen-symbols").checked
    };
}

function generatePassword(options: GeneratorOptions): string {
    let alphabet = "";

    if (options.upper) alphabet += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (options.lower) alphabet += "abcdefghijklmnopqrstuvwxyz";
    if (options.digits) alphabet += "0123456789";
    if (options.symbols) alphabet += "!@#$%^&*()-_=+[]{};:,.<>?/|~";

    if (!alphabet) {
        alphabet = "abcdefghijklmnopqrstuvwxyz";
    }

    const length = Math.max(1, Math.min(128, options.length | 0));
    const buffer = new Uint32Array(length);

    crypto.getRandomValues(buffer);

    let output = "";

    for (let i = 0; i < length; i++) {
        output += alphabet.charAt(buffer[i] % alphabet.length);
    }

    return output;
}

export function generateWithDefaults(): string {
    const length = app.settings?.passwordGeneratorLength || 20;

    return generatePassword({
        length,
        upper: true,
        lower: true,
        digits: true,
        symbols: true
    });
}

function regenGen(): void {
    const password = generatePassword(currentGenOptions());

    byId<HTMLInputElement>("gen-output").value = password;

    const strength = strengthOf(password);
    const bar = byId<HTMLElement>("gen-strength-bar");

    bar.style.setProperty("--pct", strength.pct + "%");
    bar.style.setProperty("--color", strength.color);

    byId("gen-strength-label").textContent = strength.label;
}

export function bindGeneratorActions(): void {
    byId<HTMLInputElement>("gen-length").addEventListener("input", () => {
        byId("gen-length-val").textContent = byId<HTMLInputElement>("gen-length").value;
        regenGen();
    });

    document.querySelectorAll("#gen-upper, #gen-lower, #gen-digits, #gen-symbols")
        .forEach((element) => {element.addEventListener("change", regenGen);});

    byId("gen-regen").addEventListener("click", regenGen);
    byId("gen-close").addEventListener("click", closeModal);

    byId("gen-copy").addEventListener("click", () => {
        const password = byId<HTMLInputElement>("gen-output").value;

        if (password) {
            vscode.postMessage({type: "copyText", text: password});
        }
    });

}
