import { closestElement } from "./dom";
import { closeMenu } from "./contextMenu";
import { closeModal } from "./modals";

export function bindDocumentEvents(): void {
    document.addEventListener("click", () => {
        closeMenu();
    });

    document.addEventListener("contextmenu", (event) => {
        const insideSatoApp = closestElement(event.target, ".app");

        if (insideSatoApp) {
            event.preventDefault();
            closeMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
            closeModal();
        }
    });
}
