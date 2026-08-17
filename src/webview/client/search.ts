import { byId } from "./dom";
import { app } from "./state";
import { renderEntries } from "./entries";

let searchTimer: number | undefined;

export function bindSearch(): void {
    const input = byId<HTMLInputElement>("search");

    input.addEventListener("input", (event) => {
        if (app.vaultLocked) {
            return;
        }

        const target = event.target as HTMLInputElement;
        const value = target.value.trim();

        window.clearTimeout(searchTimer);

        searchTimer = window.setTimeout(() => {
            app.searchQuery = value;
            renderEntries();
        }, 150);
    });
}
