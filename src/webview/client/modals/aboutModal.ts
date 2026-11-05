import { byId } from "../dom";
import { vscode } from "../globals";
import { closeModal, openModal } from "./modalLifecycle";

export function bindAboutModalActions(): void {
    byId("about-close").addEventListener("click", closeModal);
    byId("about-header-close").addEventListener("click", closeModal);

    byId("about-version-copy").addEventListener("click", () => {
        const version = byId<HTMLElement>("about-version-value").textContent || "";
        vscode.postMessage({type: "copyText", text: version});
    });
}

export function openAboutTab(): void {
    openModal("about-modal");
}
