import { byId } from "./dom";
import { app } from "./state";
import { vscode } from "./globals";
import { openModal, closeModal } from "./modals";

export function openSettingsModal(): void {
    byId<HTMLInputElement>("s-autolock").value = String(
        app.settings.autoLockTimeout || 0
    );

    byId<HTMLInputElement>("s-clipclear").value = String(
        app.settings.clipboardClearTimeout || 0
    );

    byId<HTMLInputElement>("s-genlen").value = String(
        app.settings.passwordGeneratorLength || 20
    );

    byId<HTMLInputElement>("s-confirmdel").checked =
        !!app.settings.confirmBeforeDelete;

    byId<HTMLInputElement>("s-showpw").checked =
        !!app.settings.showPasswordsByDefault;

    openModal("settings-modal");
}

export function bindSettingsActions(): void {
    byId("s-cancel").addEventListener("click", closeModal);

    byId("s-save").addEventListener("click", () => {
        const next = {
            autoLockTimeout: Math.max(
                0,
                Math.min(
                    240,
                    parseInt(byId<HTMLInputElement>("s-autolock").value, 10) || 0
                )
            ),

            clipboardClearTimeout: Math.max(
                0,
                Math.min(
                    600,
                    parseInt(byId<HTMLInputElement>("s-clipclear").value, 10) || 0
                )
            ),

            passwordGeneratorLength: Math.max(
                4,
                Math.min(
                    128,
                    parseInt(byId<HTMLInputElement>("s-genlen").value, 10) || 20
                )
            ),

            confirmBeforeDelete:
                byId<HTMLInputElement>("s-confirmdel").checked,

            showPasswordsByDefault:
                byId<HTMLInputElement>("s-showpw").checked,

            showStatusBar:
                app.settings.showStatusBar !== false
        };

        vscode.postMessage({
            type: "updateSettings",
            settings: next
        });

        closeModal();
    });
}
