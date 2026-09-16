import { renderTree } from "./tree";
import { renderStatus } from "./status";
import { renderEntries } from "./entries";
import { renderDetails } from "./details";

import { applyColumnWidths } from "./resize";

export function renderAll(): void {
    applyColumnWidths();
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
    applyColumnWidths();
    renderTree();
    renderEntries();
    renderDetails();
    renderStatus();
}
