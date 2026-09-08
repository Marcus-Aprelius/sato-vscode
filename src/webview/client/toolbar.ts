import { byId } from "./dom";
import { openSettingsModal } from "./settings";
import { openFileMenu } from "./menus/fileMenu";
import { openHelpMenu } from "./menus/helpMenu";
import { openViewMenu } from "./menus/viewMenu";
import { openEntryMenu } from "./menus/entryMenu";
import { openToolsMenu } from "./menus/toolsMenu";
import { openFolderMenu } from "./menus/folderMenu";


export function bindToolbarActions(): void {

    byId("btn-file").addEventListener("click", (event) => {
        event.stopPropagation();
        openFileMenu(event.currentTarget as HTMLElement);
    });

    byId("btn-entry").addEventListener("click", (event) => {
        event.stopPropagation();
        openEntryMenu(event.currentTarget as HTMLElement);
    });

    byId("btn-folder").addEventListener("click", (event) => {
        event.stopPropagation();
        openFolderMenu(event.currentTarget as HTMLElement);
    });

    byId("btn-tools").addEventListener("click", (event) => {
        event.stopPropagation();
        openToolsMenu(event.currentTarget as HTMLElement);
    });

    byId("btn-view").addEventListener("click", (event) => {
        event.stopPropagation();
        openViewMenu(event.currentTarget as HTMLElement);
    });

    byId("btn-help").addEventListener("click", (event) => {
        event.stopPropagation();
        openHelpMenu(event.currentTarget as HTMLElement);
    });

    byId("btn-settings").addEventListener("click", (event) => {
        event.stopPropagation();
        openSettingsModal();
    });
}
