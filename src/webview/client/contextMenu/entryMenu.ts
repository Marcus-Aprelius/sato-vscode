import { showMenu } from "./menu";
import { vscode } from "../globals";
import { openEntryModal, openPrivateKeyPasswordModal } from "../modals";
import { app, entryIndex, isReadOnlyVault, parentGroupOf } from "../state";
import { renderDetails } from "../details";
import { hasArchiveInfoTab, hasArchivePreviewTab } from "../details/archivePreviewSupport";

import type { MenuItem } from "../types";

export function openEntryMenu(
    x: number,
    y: number,
    entryId: string
): void {
    if (app.vaultLocked) {
        return;
    }

    const entry = entryIndex.get(entryId);

    if (entry && entry.readOnly) {
        if (app.state.vaultFormat === "archive") {
            const parentGroupId = parentGroupOf.get(entryId) || "archive-root";
            const selectedArchive = app.state.archives?.find(archive => archive.filePath === app.state.selectedArchivePath);
            const archiveEditable = selectedArchive?.editable === true && selectedArchive.backup !== true;

            const items: MenuItem[] = [
                { label: "Extract File to...", action: () => {vscode.postMessage({type: "extractArchiveEntry", entryId});} },
                { label: "Extract all to...", action: () => {vscode.postMessage({type: "extractArchiveAll"});} }
            ];

            if (archiveEditable) {
                items.push(
                    { sep: true },
                    { label: "Add File...", action: () => {vscode.postMessage({type: "addArchiveFile", groupId: parentGroupId});} },
                    { label: "Delete File...", action: () => {vscode.postMessage({type: "deleteArchiveEntry", entryId});} }
                );
            }

            const detailsItems: MenuItem[] = [];

            if (hasArchiveInfoTab(entry)) {
                detailsItems.push({ label: "Show Info", action: () => {openArchiveDetailsTab("info");} });
            }

            if (hasArchivePreviewTab(entry)) {
                detailsItems.push({ label: "Preview", action: () => {openArchiveDetailsTab("preview");} });
            }

            if (detailsItems.length > 0) {
                items.push({sep: true}, ...detailsItems);
            }

            showMenu(x, y, items);
            return;
        }

        const items: MenuItem[] = [];

        if (isPasswordEditablePrivateKey(entry)) {
            const encryption = (entry.values?.Encryption || "").trim().toLowerCase();
            const summary = entry.values?.Summary || "";

            const encrypted = entry.values?.Status === "Locked" ||
                (entry.values?.Protection || "").toLowerCase().includes("password") ||
                (encryption !== "" && encryption !== "none") ||
                (/\bencrypted\b/i.test(summary) && !/\bunencrypted\b/i.test(summary));

            const keyStore = entry.values?.Type === "Java KeyStore" || entry.values?.Type === "Java Cryptography Extension KeyStore";
            const ageFile = entry.values?.Type === "age Encrypted File";

            const luksContainer = entry.values?.Type === "LUKS Encrypted Container" ||
                entry.values?.Type === "LUKS1 Encrypted Container" ||
                entry.values?.Type === "LUKS2 Encrypted Container";

            if (ageFile || luksContainer) {
                items.push(
                    { label: "Change Password...", action: () => {vscode.postMessage({type: "preparePrivateKeyPasswordChange", entryId});} },
                    { sep: true }
                );
            } else if (encrypted) {
                items.push({ label: "Change Password...", action: () => {vscode.postMessage({type: "preparePrivateKeyPasswordChange", entryId});} });

                if (!keyStore) {
                    items.push({ label: "Remove Password...", action: () => {openPrivateKeyPasswordModal(entryId, "remove");} });
                }

                items.push({sep: true});
            } else if (!keyStore) {
                items.push(
                    { label: "Set Password...", action: () => {vscode.postMessage({type: "preparePrivateKeyPasswordChange", entryId});} },
                    { sep: true }
                );
            }
        }

        if (entry.values?.Summary) {
            items.push({ label: "Copy Summary", action: () => {vscode.postMessage({type: "copyText", text: entry.values?.Summary || ""});} });
        }

        if (entry.values?.["File path"]) {
            items.push({ label: "Copy File Path", action: () => {vscode.postMessage({type: "copyText", text:entry.values?.["File path"] || ""});} });
        }

        if (items.length > 0) {
            showMenu(x, y, items);
        }

        return;
    }

    if (entry && isReadOnlyVault()) {
        showMenu(x, y, [
            {
                label: "Copy Username",
                disabled: !entry.username,
                action: () => {vscode.postMessage({type: "copySecret", entryId, field: "UserName"});}
            },
            {
                label: "Copy Password",
                disabled: !entry.hasPassword,
                action: () => {vscode.postMessage({type: "copySecret", entryId, field: "Password"});}
            },
            {
                label: "Copy URL",
                disabled: !entry.url,
                action: () => {vscode.postMessage({type: "copySecret", entryId, field: "URL"});}
            },
            {
                label: "Copy Notes",
                disabled: !entry.notes,
                action: () => {vscode.postMessage({type: "copySecret", entryId, field: "Notes"});}
            }
        ]);

        return;
    }

    showMenu(x, y, [
        { label: "Copy Username", action: () => {vscode.postMessage({type: "copySecret", entryId, field: "UserName"});} },
        { label: "Copy Password", action: () => {vscode.postMessage({type: "copySecret", entryId, field: "Password"});} },
        { label: "Copy URL", action: () => {vscode.postMessage({type: "copySecret", entryId, field: "URL"});} },
        { sep: true },
        { label: "Edit Entry", action: () => {openEntryModal(entryId);} },
        { label: "Duplicate Entry", action: () => {vscode.postMessage({type: "duplicateEntry", entryId});} },
        { label: "Delete Entry", action: () => {vscode.postMessage({type: "deleteEntry", entryId});} }
    ]);
}

function openArchiveDetailsTab(
    tab: "info" | "preview"
): void {
    if (app.detailsTab === tab) {
        return;
    }

    app.detailsTab = tab;
    renderDetails();
}

function isPasswordEditablePrivateKey(
    entry: NonNullable<ReturnType<typeof entryIndex.get>>
): boolean {
    const filePath = entry.values?.["File path"] || "";
    if (filePath.toLowerCase().endsWith(".bak")) {
        return false;
    }
    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
    const supportedKeyStore = normalizedPath.endsWith(".jks") || normalizedPath.endsWith(".jceks");
    const fileName = normalizedPath.split("/").at(-1) || "";
    const supportedPpk = normalizedPath.endsWith(".ppk");
    const supportedPkcs12 = normalizedPath.endsWith(".p12") || normalizedPath.endsWith(".pfx");
    const supportedAge = normalizedPath.endsWith(".age");
    const supportedLuks = normalizedPath.endsWith(".luks");

    const luksContainer =
        entry.values?.Type === "LUKS Encrypted Container" ||
        entry.values?.Type === "LUKS1 Encrypted Container" ||
        entry.values?.Type === "LUKS2 Encrypted Container";

    const supportedExtension = [".pem", ".key", ".p8", ".pk8"].some(extension => normalizedPath.endsWith(extension));
    const supportedOpenSshKey = ["id_rsa", "id_ecdsa", "id_ed25519"].includes(fileName);
    const privateKeyType = ["Private Key", "RSA Private Key", "EC Private Key"].includes(entry.values?.Type || "");

    return (supportedExtension && privateKeyType) ||
    (supportedOpenSshKey && entry.values?.Type === "OpenSSH Private Key") ||
    (supportedPpk && entry.values?.Type === "PuTTY Private Key") ||
    (supportedKeyStore && (entry.values?.Type === "Java KeyStore" || entry.values?.Type === "Java Cryptography Extension KeyStore")) ||
    (supportedPkcs12 && entry.values?.Type === "PKCS#12 Container") ||
    (supportedAge && entry.values?.Type === "age Encrypted File" && entry.values?.Protection === "Passphrase") ||
    (supportedLuks && luksContainer);
}
