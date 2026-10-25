import { byId } from "./dom";
import { vscode } from "./globals";
import { openModal, openPrivateKeyPasswordModal } from "./modals";
import { renderStatus } from "./status";
import { renderDetails } from "./details";
import { renderEntries } from "./entries";
import { openDropdown, openGroupMenu, showMenu } from "./contextMenu";
import { app, entryIndex, groupIndex, resetCryptoUiState, isCryptoFileView } from "./state";
import { fileCategoryFilterLabel, normalizeFileCategoryFilters, setFileCategoryFilters } from "./fileCategoryFilter";

import type { EntryView, GroupView} from "../../vault";
import type { MenuItem } from "./types";

let pendingSupportedFileMenu: | { x: number; y: number; filePath: string; } | undefined;

export function renderTree(): void {

    const treeElement = byId<HTMLElement>("tree");
    const titleElement = byId<HTMLElement>("groups-title");
    treeElement.innerHTML = "";

    if (app.state.vaultFormat === "files") {
        renderArchiveList(treeElement, titleElement);
        return;
    }

    if (isCryptoFileView()) {
        const fileCount = app.state.tree.groups.length;
        titleElement.textContent = `Crypto Files (${fileCount})`;

        for (const group of app.state.tree.groups) {
            treeElement.appendChild(renderGroupNode(group, 0));
        }

        return;
    }

    if (app.state.vaultFormat === "archive") {
        renderArchiveList(treeElement, titleElement);
        return;
    }

    titleElement.textContent = "Groups";
    treeElement.appendChild(renderGroupNode(app.state.tree, 0));
}

function renderArchiveList(
    treeElement: HTMLElement,
    titleElement: HTMLElement
): void {
    const allFiles = app.state.archives || [];
    const selectedCategories = app.settings.fileCategoryFilters;
    const showAll = selectedCategories.includes("all");
    const files = showAll ? allFiles : allFiles.filter(file => selectedCategories.includes(file.category));
    renderFileListTitle(titleElement, files.length);

    if (files.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No supported files found.";
        treeElement.appendChild(empty);

        return;
    }

    for (const file of files) {
        treeElement.appendChild(renderSupportedFileListItem(file));
    }
}

function renderFileListTitle(
    titleElement: HTMLElement,
    fileCount: number
): void {
    titleElement.innerHTML = "";
    titleElement.style.display = "flex";
    titleElement.style.alignItems = "center";
    titleElement.style.justifyContent = "space-between";
    titleElement.style.gap = "8px";

    const title = document.createElement("span");
    title.textContent = `Files (${fileCount})`;

    const filterButton = document.createElement("button");
    const selectedFilters = normalizeFileCategoryFilters(app.settings.fileCategoryFilters);

    filterButton.type = "button";
    filterButton.className = "btn";
    filterButton.textContent = fileCategoryFilterLabel(selectedFilters) + " ▾";
    filterButton.title = "Select one file category";
    filterButton.style.padding = "1px 6px";
    filterButton.style.minHeight = "20px";
    filterButton.style.fontSize = "11px";

    filterButton.addEventListener("click", event => {
        event.stopPropagation();

        openDropdown(filterButton, [
            createFileCategoryFilterItem("All", "all", selectedFilters),
            createFileCategoryFilterItem("Vaults", "vaults", selectedFilters),
            createFileCategoryFilterItem("Archives", "archives", selectedFilters),
            createFileCategoryFilterItem("SSH", "ssh", selectedFilters),
            createFileCategoryFilterItem("Crypto Files", "crypto", selectedFilters)
        ]);
    });

    titleElement.appendChild(title);
    titleElement.appendChild(filterButton);
}

function createFileCategoryFilterItem(
    label: string,
    category: "all" | "vaults" | "archives" | "ssh" | "crypto",
    selectedFilters: ReadonlyArray<"all" | "vaults" | "archives" | "ssh" | "crypto">
) {
    const selected = selectedFilters.length === 1 && selectedFilters[0] === category;

    return {
        label: selected ? `✓ ${label}` : label,
        title: `Show only ${label.toLowerCase()}`,
        action: () => {setFileCategoryFilters([category]); renderTree();}
    };
}

function renderSupportedFileListItem(
    file: NonNullable<typeof app.state.archives>[number]
): HTMLElement {
    const row = document.createElement("div");
    const selected = file.filePath === app.state.selectedArchivePath;
    row.className = "group-node archive-list-item" + (selected ? " active" : "");
    row.dataset.filePath = file.filePath;
    row.style.paddingLeft = "6px";

    const icon = document.createElement("span");
    icon.className = `codicon ${supportedFileIcon(file)}`;
    icon.style.marginRight = "6px";
    icon.style.flex = "0 0 auto";

    const label = document.createElement("span");
    label.className = "group-label";
    label.textContent = file.fileName;
    label.title = file.filePath;

    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = file.category === "archives" && file.entryCount !== undefined ? String(file.entryCount) : "";
    row.appendChild(icon);
    row.appendChild(label);
    row.appendChild(count);

    row.addEventListener("click", event => {
        event.stopPropagation();

        if (selected) {
            return;
        }

        if (file.category === "archives" && app.state.vaultFormat === "archive") {
            vscode.postMessage({type: "selectArchive", filePath: file.filePath});
            return;
        }

        vscode.postMessage({type: "openSupportedFile", filePath: file.filePath});
    });

    row.addEventListener("contextmenu", event => {
        event.preventDefault();
        event.stopPropagation();

        if (file.category === "crypto" || file.category === "ssh") {
            if (!selected) {
                pendingSupportedFileMenu = {x: event.clientX, y: event.clientY, filePath: file.filePath};
                vscode.postMessage({type: "openSupportedFile", filePath: file.filePath});
                return;
            }

            const entry = app.selectedEntryId ? entryIndex.get(app.selectedEntryId) : undefined;

            if (entry) {
                openCryptoFileMenu(event.clientX, event.clientY, entry);
            }

            return;
        }

        if (file.category !== "archives") {
            return;
        }

        if (!selected) {
            if (app.state.vaultFormat === "archive") {
                vscode.postMessage({type: "selectArchive", filePath: file.filePath});
            } else {
                vscode.postMessage({type: "openSupportedFile", filePath: file.filePath});
            }

            return;
        }

        openGroupMenu(event.clientX, event.clientY, "archive-root");
    });

    return row;
}

export function openPendingSupportedFileMenu(): void {
    const pending = pendingSupportedFileMenu;

    if (!pending) {
        return;
    }

    pendingSupportedFileMenu = undefined;

    if (app.state.selectedArchivePath !== pending.filePath || !app.selectedEntryId) {
        return;
    }

    const entry = entryIndex.get(app.selectedEntryId);

    if (!entry) {
        return;
    }

    openCryptoFileMenu(pending.x, pending.y, entry);
}

function supportedFileIcon(
    file: NonNullable<typeof app.state.archives>[number]
): string {
    switch (file.category) {
        case "vaults":
            return "codicon-lock";

        case "archives":
            return file.encrypted ? "codicon-lock" : "codicon-file-zip";

        case "ssh":
            return "codicon-key";

        case "crypto":
            return "codicon-file-code";
    }
}

function renderGroupNode(group: GroupView, depth: number): HTMLElement {
    const wrap = document.createElement("div");
    const row = document.createElement("div");
    row.className = "group-node" + (group.id === app.selectedGroupId ? " active" : "");
    row.style.paddingLeft = 6 + depth * 10 + "px";
    row.dataset.groupId = group.id;

    const caret = document.createElement("span");
    caret.className = "group-caret";
    caret.textContent = group.groups.length ? "▸" : "";
    row.appendChild(caret);

    const label = document.createElement("span");
    label.className = "group-label";
    label.textContent = group.name;
    row.appendChild(label);

    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = group.entries.length ? String(group.entries.length) : "";
    row.appendChild(count);
    row.addEventListener("click", (event) => {event.stopPropagation(); selectGroup(group.id);});

    row.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectGroup(group.id);

        if (isCryptoFileView()) {
            const entry = group.entries[0];

            if (!entry) {
                return;
            }

            openCryptoFileMenu(event.clientX, event.clientY, entry);
            return;
        }

        openGroupMenu(event.clientX, event.clientY, group.id);
    });

    wrap.appendChild(row);

    if (group.groups.length) {
        const ul = document.createElement("ul");

        for (const child of group.groups) {
            const li = document.createElement("li");
            li.appendChild(renderGroupNode(child, depth + 1));
            ul.appendChild(li);
        }

        wrap.appendChild(ul);
    }

    return wrap;
}

export function selectGroup(groupId: string): void {
    if (app.vaultLocked) {
        return;
    }

    app.selectedGroupId = groupId;
    const group = groupIndex.get(groupId);

    if (group && group.entries.length > 0) {
        app.selectedEntryId = group.entries[0].id;
    } else {
        app.selectedEntryId = null;
    }

    resetCryptoUiState();
    app.showVaultEmptyValues = app.settings.showEmptyValuesByDefault;

    renderTree();
    renderEntries();
    renderDetails();
    renderStatus();
}

function isConvertibleCryptoFile(
    entry: EntryView
): boolean {
    return (entry.values?.Type === "X.509 Certificate" && (entry.values.Encoding === "PEM" || entry.values.Encoding === "DER")) ||
        entry.values?.Type === "OpenSSH Public Key" || entry.values?.Type === "RSA Private Key" || entry.values?.Type === "RSA Public Key" ||
        entry.values?.Type === "EC Private Key" || entry.values?.Type === "EC Public Key" ||
            (entry.values?.Type === "Private Key" && (entry.values.Algorithm === "RSA" || entry.values.Algorithm === "EC")) ||
            entry.values?.Type === "Authenticode Certificate Container";
}

function isExtractableCryptoFile(
    entry: EntryView
): boolean {
    return (
        entry.values?.Type === "Authenticode Certificate Container" || entry.values?.Type === "RSA Private Key" || entry.values?.Type === "EC Private Key" ||
        (entry.values?.Type === "Private Key" && (entry.values.Algorithm === "RSA" || entry.values.Algorithm === "EC"))
    );
}

function openCryptoFileMenu(
    x: number,
    y: number,
    entry: EntryView
): void {

    const convertible = isConvertibleCryptoFile(entry);
    const extractable = isExtractableCryptoFile(entry);
    const passwordEditable = isPasswordEditablePrivateKey(entry);
    const encryption = (entry.values?.Encryption || "").trim().toLowerCase();
    const protection = (entry.values?.Protection || "").trim().toLowerCase();
    const summary = entry.values?.Summary || "";

    const passwordEncrypted = entry.values?.Status === "Locked" || protection.includes("password") || protection === "passphrase" ||
        (encryption !== "" && encryption !== "none") || (/\bencrypted\b/i.test(summary) && !/\bunencrypted\b/i.test(summary));

    const items: MenuItem[] = [];

    items.push({
        label: "Show Info",
        title: "Show information about the selected crypto file",

        action: () => {
            byId("dbinfo-body").innerHTML = '<div class="empty">Loading...</div>';
            byId("dbinfo-title-label").textContent = "File Info";
            openModal("dbinfo-modal");
            vscode.postMessage({type: "getDbInfo", entryId: entry.id});
        }
    });

    if (passwordEditable) {
        items.push({sep: true});
        const keyStore = isJavaKeyStore(entry);
        const ageFile = entry.values?.Type === "age Encrypted File";
        const luksContainer =
            entry.values?.Type === "LUKS Encrypted Container" ||
            entry.values?.Type === "LUKS1 Encrypted Container" ||
            entry.values?.Type === "LUKS2 Encrypted Container";

        if (ageFile || luksContainer) {
            items.push({
                label: "Change Password...",
                action: () => {vscode.postMessage({type: "preparePrivateKeyPasswordChange", entryId: entry.id});}
            });
        } else if (passwordEncrypted) {
            items.push({
                label: "Change Password...",
                action: () => {vscode.postMessage({type: "preparePrivateKeyPasswordChange", entryId: entry.id});}
            });

            if (!keyStore) {
                items.push({
                    label: "Remove Password...",
                    action: () => {openPrivateKeyPasswordModal(entry.id, "remove");}
                });
            }
        } else if (!keyStore) {
            items.push({
                label: "Set Password...",
                action: () => {vscode.postMessage({type: "preparePrivateKeyPasswordChange", entryId: entry.id});}
            });
        }
    }

    items.push(
        { sep: true },
        {
            label: "Convert...",
            title: convertible ? "Convert the selected file" : "Conversion is not available for this file",
            disabled: !convertible,

            action: () => {
                if (!convertible) {
                    return;
                }

                vscode.postMessage({type: "prepareCryptoConversion", entryId: entry.id, initialTab: "convert"});
            }
        },
        {
            label: "Extract...",
            title: extractable ? "Extract available content from the selected file" : "Extraction is not available for this file",
            disabled: !extractable,

            action: () => {
                if (!extractable) {
                    return;
                }

                vscode.postMessage({type: "prepareCryptoConversion", entryId: entry.id, initialTab: "extract"});
            }
        }
    );

    showMenu(x, y, items);
}

function isPasswordEditablePrivateKey(
    entry: EntryView
): boolean {
    const filePath = entry.values?.["File path"] || "";

    if (filePath.toLowerCase().endsWith(".bak")) {
        return false;
    }

    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
    const supportedPkcs12 = normalizedPath.endsWith(".p12") || normalizedPath.endsWith(".pfx");
    const supportedAge = normalizedPath.endsWith(".age");
    const supportedLuks = normalizedPath.endsWith(".luks");
    const luksContainer = entry.values?.Type === "LUKS Encrypted Container" || entry.values?.Type === "LUKS1 Encrypted Container" || entry.values?.Type === "LUKS2 Encrypted Container";
    const supportedOpenPgp = normalizedPath.endsWith(".gpg") || normalizedPath.endsWith(".pgp") || normalizedPath.endsWith(".asc");
    const openPgpPrivateKey = entry.values?.Type === "OpenPGP Private Key";
    const fileName = normalizedPath.split("/").at(-1) || "";
    const supportedPpk = normalizedPath.endsWith(".ppk");
    const supportedKeyStore = normalizedPath.endsWith(".jks") || normalizedPath.endsWith(".jceks");
    const supportedExtension = [".pem", ".key", ".p8", ".pk8"].some(extension => normalizedPath.endsWith(extension));
    const supportedOpenSshKey = ["id_rsa", "id_ecdsa", "id_ed25519"].includes(fileName);
    const privateKeyType = ["Private Key", "RSA Private Key", "EC Private Key"].includes(entry.values?.Type || "");

    return (supportedExtension && privateKeyType) ||
        (supportedOpenSshKey && entry.values?.Type === "OpenSSH Private Key") ||
        (supportedPpk && entry.values?.Type === "PuTTY Private Key") ||
        (supportedKeyStore && (entry.values?.Type === "Java KeyStore" || entry.values?.Type === "Java Cryptography Extension KeyStore")) ||
        (supportedPkcs12 && entry.values?.Type === "PKCS#12 Container") ||
        (supportedAge && entry.values?.Type === "age Encrypted File" && entry.values?.Protection === "Passphrase") ||
        (supportedOpenPgp && openPgpPrivateKey) || (supportedLuks && luksContainer);
}

function isJavaKeyStore(
    entry: EntryView
): boolean {
    return (entry.values?.Type === "Java KeyStore" || entry.values?.Type === "Java Cryptography Extension KeyStore");
}
