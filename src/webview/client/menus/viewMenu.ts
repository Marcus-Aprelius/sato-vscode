import { vscode } from "../globals";
import { applyTheme } from "../theme";
import { renderStatus } from "../status";
import { renderDetails } from "../details";
import { renderTree } from "../tree";
import { openDropdown } from "../contextMenu";
import { app, getSelectedEntry } from "../state";
import { FILE_CATEGORIES, normalizeFileCategoryFilters, setFileCategoryFilters as saveFileCategoryFilters } from "../fileCategoryFilter";
import { countCryptoEmptyValues, countVaultEmptyValues } from "../details/emptyValues";

import type { MenuItem } from "../types";
import type { AppTheme, FileCategoryFilter} from "../../render/types";

export function openViewMenu(
    button: HTMLElement
): void {
    const entry = getSelectedEntry();
    const isCryptoEntry = Boolean(entry && entry.readOnly);
    const emptyValuesCount = entry ? isCryptoEntry ? countCryptoEmptyValues(entry) : countVaultEmptyValues(entry) : 0;
    const showEmptyValues = isCryptoEntry ? app.showEmptyValues : app.showVaultEmptyValues;
    const selectedCategories = normalizeFileCategoryFilters(app.settings.fileCategoryFilters);
    const allSelected = selectedCategories.includes("all");

    const items: MenuItem[] = [
        {
            label: "Show Only",
            title: "Select the file categories displayed in the first column",

            children: [
                {
                    label: allSelected ? "✓ All" : "All",
                    title: "Show all file formats supported by SATO",
                    action: () => {setFileCategoryFilters(["all"]);}

                },
                { sep: true },
                createCategoryMenuItem("Vaults", "vaults", selectedCategories),
                createCategoryMenuItem("Archives", "archives", selectedCategories),
                createCategoryMenuItem("SSH", "ssh", selectedCategories),
                createCategoryMenuItem("Crypto Files", "crypto", selectedCategories)
            ]
        },
        { sep: true },
        {
            label: showEmptyValues ? "✓ Show Empty Values" : "Show Empty Values",
            title: emptyValuesCount === 0 ? "No empty values" : showEmptyValues ? "Hide empty values" : "Show empty values",
            disabled: emptyValuesCount === 0,

            action: () => {
                if (emptyValuesCount === 0) {
                    return;
                }

                if (isCryptoEntry) {
                    app.showEmptyValues = !app.showEmptyValues;
                } else {
                    app.showVaultEmptyValues = !app.showVaultEmptyValues;
                }

                renderDetails();
                renderStatus();
            }
        },
        {
            label: "Theme",
            title: "Select the SATO color theme",

            children: [
                {
                    label: app.settings.theme === "vscode" ? "✓ VS Code Theme" : "VS Code Theme",
                    action: () => {selectTheme("vscode");}
                },
                {
                    label: app.settings.theme === "dark" ? "✓ Dark" : "Dark",
                    action: () => {selectTheme("dark");}
                },
                {
                    label: app.settings.theme === "gray" ? "✓ Gray" : "Gray",
                    action: () => {selectTheme("gray");}
                },
                {
                    label: app.settings.theme === "light" ? "✓ Light" : "Light",
                    action: () => {selectTheme("light");}
                }
            ]
        },
        { sep: true},
        {
            label:app.settings.showStatusBar ? "✓ Show Status Bar" : "Show Status Bar",
            title: app.settings.showStatusBar ? "Hide status bar" : "Show status bar",

            action: () => {
                const next = {...app.settings, showStatusBar: !app.settings .showStatusBar};
                app.settings = next;
                vscode.postMessage({type: "updateSettings", settings: next});
                renderStatus();
            }
        }
    ];

    openDropdown(button, items);
}

function createCategoryMenuItem(
    label: string,
    category: FileCategoryFilter,
    selectedCategories: FileCategoryFilter[]
): MenuItem {
    const selected = selectedCategories.includes(category);

    return {
        label: selected ? `✓ ${label}` : label,
        title: selected ? `Hide ${label.toLowerCase()} from the first column` : `Show ${label.toLowerCase()} in the first column`,

        action: () => {
            if (selectedCategories.includes("all")) {
                setFileCategoryFilters([category]);
                return;
            }

            if (selected) {
                if (selectedCategories.length === 1) {
                    return;
                }

                setFileCategoryFilters(selectedCategories.filter(value => value !== category));
                return;
            }

            setFileCategoryFilters([...selectedCategories, category]);
        }
    };
}

function setFileCategoryFilters(
    filters: FileCategoryFilter[]
): void {
    saveFileCategoryFilters(filters);
    renderTree();
}

function selectTheme(
    theme: AppTheme
): void {
    const next = {...app.settings, theme};
    app.settings = next;
    applyTheme(theme);
    vscode.postMessage({type: "updateSettings", settings: next});
}
