import { reindex } from "./state";
import { setupColumnResize } from "./resize";
import { setupGroupsPaneContextMenu } from "./contextMenu";
import { renderAll } from "./render";
import { updateMainActionButton, updateToolbarForMode } from "./buttons";
import { bindToolbarActions } from "./toolbar";
import { bindModalActions } from "./modals";
import { bindGeneratorActions } from "./generator";
import { bindSettingsActions } from "./settings";
import { bindInboundMessages } from "./messages";
import { bindSearch } from "./search";
import { bindDocumentEvents } from "./documentEvents";

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
