import { reindex } from "./state";
import { renderAll } from "./render";
import { bindSearch } from "./search";
import { bindModalActions } from "./modals";
import { setupColumnResize } from "./resize";
import { bindToolbarActions } from "./toolbar";
import { bindSettingsActions } from "./settings";
import { bindInboundMessages } from "./messages";
import { bindGeneratorActions } from "./generator";
import { bindDocumentEvents } from "./documentEvents";
import { setupGroupsPaneContextMenu } from "./contextMenu";
import { updateMainActionButton, updateToolbarForMode } from "./buttons";

export function initializeClient(): void {
    reindex();

    setupColumnResize();
    setupGroupsPaneContextMenu();

    bindDocumentEvents();
    bindToolbarActions();
    bindModalActions();
    bindGeneratorActions();
    bindSettingsActions();
    bindSearch();
    bindInboundMessages();

    renderAll();
    updateToolbarForMode();
    updateMainActionButton();
}
