import { vscode } from "../globals";
import { openDropdown } from "../contextMenu";
import { openAboutTab, openModal } from "../modals";

import type { MenuItem } from "../types";

export function openHelpMenu(button: HTMLElement): void {
    const items: MenuItem[] = [
        {
            label: "Home Page",
            title: "Open project home page",
            action: () => {vscode.postMessage({type: "openUrl", url: "https://github.com/Marcus-Aprelius/sato-vscode"});}
        },

        {
            label: "Check Update",
            title: "Check for new SATO version",
            action: () => {vscode.postMessage({type: "checkUpdate"});}
        },

        { sep: true },
        
        {
            label: "Supported Formats",
            title: "Show supported vault and crypto file formats",
            action: () => {openModal("about-modal"); openAboutTab("supportedFormats");}
        },

        {
            label: "About",
            title: "About SATO",
            action: () => {openModal("about-modal"); openAboutTab("about");}
        }
    ];

    openDropdown(button, items);
}
