import { byId } from "./dom";
import { app } from "./state";

export function applyColumnWidths(): void {
    const layout = byId<HTMLElement>("layout");

    layout.style.gridTemplateColumns =
        app.groupsWidth + "px 4px " + app.entriesWidth + "px 4px 1fr";
}

export function setupColumnResize(): void {
    const resizeGroups = byId<HTMLElement>("resize-groups");
    const resizeEntries = byId<HTMLElement>("resize-entries");

    const startResize = (kind: "groups" | "entries", event: PointerEvent): void => {
        event.preventDefault();
        event.stopPropagation();

        const handle = event.currentTarget as HTMLElement;
        const startX = event.clientX;
        const startGroupsWidth = app.groupsWidth;
        const startEntriesWidth = app.entriesWidth;

        handle.classList.add("active");
        document.body.classList.add("resizing");

        const onMove = (moveEvent: PointerEvent): void => {
            moveEvent.preventDefault();

            const dx = moveEvent.clientX - startX;

            if (kind === "groups") {
                app.groupsWidth = Math.max(
                    160,
                    Math.min(520, startGroupsWidth + dx)
                );
            } else {
                app.entriesWidth = Math.max(
                    200,
                    Math.min(650, startEntriesWidth + dx)
                );
            }

            applyColumnWidths();
        };

        const onUp = (): void => {
            handle.classList.remove("active");
            document.body.classList.remove("resizing");

            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    };

    resizeGroups.addEventListener("pointerdown", (event) => {
        startResize("groups", event);
    });

    resizeEntries.addEventListener("pointerdown", (event) => {
        startResize("entries", event);
    });

    applyColumnWidths();
}
