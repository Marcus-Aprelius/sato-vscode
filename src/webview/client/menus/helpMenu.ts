import { vscode } from "../globals";
import { openDropdown } from "../contextMenu";
import { openAboutTab, openModal } from "../modals";

import type { MenuItem } from "../types";

export function openHelpMenu(button: HTMLElement): void {
    const items: MenuItem[] = [
        {
            label: "Documentation",
            title: "Open project documentation page",
            action: () => {vscode.postMessage({type: "openUrl", url: "https://marcus-aprelius.github.io/sato-vscode/documentation.html"});}
        },
        {
            label: "Donate",
            title: "Open project donate page",
            action: () => {vscode.postMessage({type: "openUrl", url: "https://marcus-aprelius.github.io/sato-vscode/donate.html"});}
        },
        { sep: true },
        {
            label: "Check for updates",
            title: "Check for new SATO version",
            action: () => {vscode.postMessage({type: "checkUpdate"});}
        },
        {
            label: "About",
            title: "Show SATO information and supported formats",
            action: () => {openAboutTab();}
        }
    ];

    openDropdown(button, items);
}
