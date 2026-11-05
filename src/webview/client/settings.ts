import { byId } from "./dom";
import { app } from "./state";
import { vscode } from "./globals";
import { applyTheme } from "./theme";
import { openModal, closeModal } from "./modals";

let themeBeforeSettings = app.settings.theme || "vscode";

export function openSettingsModal(): void {
    byId<HTMLInputElement>("s-autolock").value = String(app.settings.autoLockTimeout || 0);
    byId<HTMLInputElement>("s-clipclear").value = String(app.settings.clipboardClearTimeout || 0);
    byId<HTMLInputElement>("s-genlen").value = String(app.settings.passwordGeneratorLength || 20);
    byId<HTMLInputElement>("s-confirmdel").checked = !!app.settings.confirmBeforeDelete;
    byId<HTMLInputElement>("s-showpw").checked = !!app.settings.showPasswordsByDefault;
    byId<HTMLInputElement>("s-showempty").checked = !!app.settings.showEmptyValuesByDefault;
    byId<HTMLInputElement>("s-archive-backups").checked = app.settings.createArchiveBackups === true;

    themeBeforeSettings = app.settings.theme || "vscode";
    byId<HTMLSelectElement>("s-theme").value = app.settings.theme || "vscode";
    byId<HTMLSelectElement>("s-base64-default-format").value = app.settings.base64DefaultFormat || "base64url";
    byId<HTMLSelectElement>("s-yaml-json-indentation").value = app.settings.yamlJsonIndentation || "spaces-2";
    byId<HTMLSelectElement>("s-base64-default-operation").value = app.settings.base64DefaultOperation || "encode";
    byId<HTMLSelectElement>("s-yaml-json-default-operation").value = app.settings.yamlJsonDefaultOperation || "yaml-to-json";

    setSettingsTab("general");
    openModal("settings-modal");
}

export function bindSettingsActions(): void {
    byId("s-cancel").addEventListener("click", () => {applyTheme(themeBeforeSettings); closeModal();});
    byId("settings-header-close").addEventListener("click", closeModal);

    byId("s-save").addEventListener("click", () => {
        const next = {
            ...app.settings,
            autoLockTimeout: Math.max(0, Math.min(240, parseInt(byId<HTMLInputElement>("s-autolock").value, 10) || 0)),
            clipboardClearTimeout: Math.max(0, Math.min(600, parseInt(byId<HTMLInputElement>("s-clipclear").value, 10) || 0)),
            passwordGeneratorLength: Math.max(4, Math.min(128, parseInt(byId<HTMLInputElement>("s-genlen").value, 10) || 20)),
            confirmBeforeDelete: byId<HTMLInputElement>("s-confirmdel").checked,
            showPasswordsByDefault: byId<HTMLInputElement>("s-showpw").checked,
            showEmptyValuesByDefault: byId<HTMLInputElement>("s-showempty").checked,
            showStatusBar: app.settings.showStatusBar !== false,
            createArchiveBackups: byId<HTMLInputElement>("s-archive-backups").checked,
            base64DefaultFormat: byId<HTMLSelectElement>("s-base64-default-format").value as | "base64url" | "base64" | "base32" | "base32hex" | "hex",
            yamlJsonIndentation: byId<HTMLSelectElement>("s-yaml-json-indentation").value as | "spaces-2" | "spaces-4" | "tabs",
            base64DefaultOperation: byId<HTMLSelectElement>("s-base64-default-operation").value as | "encode" | "decode",
            yamlJsonDefaultOperation: byId<HTMLSelectElement>("s-yaml-json-default-operation").value as | "yaml-to-json" | "json-to-yaml",
            theme: byId<HTMLSelectElement>("s-theme").value as | "vscode" | "dark" | "gray" | "light"
        };

        vscode.postMessage({type: "updateSettings", settings: next });

        closeModal();
    });

    byId("settings-tab-general").addEventListener("click", () => {setSettingsTab("general");});
    byId("settings-tab-password-generator").addEventListener("click",() => {setSettingsTab("passwordGenerator");});
    byId("settings-tab-converter").addEventListener("click", () => {setSettingsTab("converter");});
    byId<HTMLSelectElement>("s-theme").addEventListener("change", (event) => { const select = event.target as HTMLSelectElement; applyTheme(select.value as | "vscode" | "dark" | "gray" | "light");});
}

type SettingsTab = | "general" | "passwordGenerator" | "converter";

function setSettingsTab(
    tab: SettingsTab
): void {
    const generalTab = byId<HTMLButtonElement>("settings-tab-general");
    const generatorTab = byId<HTMLButtonElement>("settings-tab-password-generator");
    const converterTab = byId<HTMLButtonElement>("settings-tab-converter");
    const generalContent = byId<HTMLElement>("settings-content-general");
    const generatorContent = byId<HTMLElement>("settings-content-password-generator");
    const converterContent = byId<HTMLElement>("settings-content-converter");
    const showGeneral = tab === "general";
    const showGenerator = tab === "passwordGenerator";
    const showConverter = tab === "converter";

    generalTab.classList.toggle("active", showGeneral);
    generatorTab.classList.toggle("active", showGenerator);
    converterTab.classList.toggle("active", showConverter);
    generalContent.style.display = showGeneral ? "" : "none";
    generatorContent.style.display = showGenerator ? "" : "none";
    converterContent.style.display = showConverter ? "" : "none";
}
