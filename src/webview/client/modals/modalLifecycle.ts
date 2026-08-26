import { byId } from "../dom";
import { app } from "../state";
import { resetCryptoUnlockState } from "./state";

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

    resetCryptoUnlockState();
}
