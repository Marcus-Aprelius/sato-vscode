import { renderTree } from "./tree";
import { renderStatus } from "./status";
import { renderEntries } from "./entries";
import { renderDetails } from "./details";

export function renderAll(): void {
    renderTree();
    renderEntries();
    renderDetails();
    renderStatus();
}

export function renderSelection(): void {
    renderTree();
    renderEntries();
    renderDetails();
}

export function renderData(): void {
    renderTree();
    renderEntries();
    renderDetails();
    renderStatus();
}
