import { renderTree } from "./tree";
import { renderEntries } from "./entries";
import { renderDetails } from "./details";
import { renderStatus } from "./status";

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
