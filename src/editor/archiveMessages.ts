import * as vscode from "vscode";
import { describeError } from "../utils/errors";
import {
    changeZipPassword,
    editZipArchive,
    extractEncryptedZipArchive,
    extractZipArchive,
    previewZipEntry,
    testEncryptedZipPassword
} from "../archives";

import type { Settings } from "../webview";
import type { FromWebview, VaultDocument } from "../types";

export async function handleArchiveMessage(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    msg: FromWebview,
    reload: () => Promise<void>,
    readSettings: () => Settings
): Promise<boolean> {
    if (!document.archive) {
        return false;
    }

    switch (msg.type) {
        case "copyText":
            await vscode.env.clipboard.writeText(msg.text);
            vscode.window.setStatusBarMessage("SATO: value copied", 2000);

            return true;

        case "getDbInfo":
            if (msg.entryId) {
                await showArchiveEntryInfo(document, panel, msg.entryId);
            } else {
                await showArchiveInfo(document, panel);
            }

            return true;

            case "prepareArchiveUnlock":
                await prepareArchiveUnlock(document, panel);

                return true;

            case "unlockArchive":
                await unlockArchive(document, panel, msg.password);

                return true;

            case "lockArchive":
                await lockArchive(document, panel);

                return true;

            case "prepareArchivePasswordSet":
                await prepareArchivePasswordSet(document, panel);

                return true;

            case "prepareArchivePasswordChange":
                await prepareArchivePasswordChange(document, panel);

                return true;

            case "changeArchivePassword":
                await changeArchivePassword(document, panel, msg.password, reload, readSettings);

                return true;

            case "deleteArchivePassword":
                await deleteArchivePassword(document, panel, reload, readSettings);

                return true;

        case "selectArchive":
            await selectArchive(document, panel, msg.filePath, readSettings);

            return true;

        case "previewArchiveEntry":
            await previewArchiveEntry(document, panel, msg.entryId);

            return true;

        case "copyArchiveInternalPath":
            await copyArchivePath(document, msg.groupId);

            return true;

        case "extractArchiveEntry":
            await extractArchiveEntry(document, msg.entryId);

            return true;

        case "extractArchiveFolder":
            await extractArchiveFolder(document, msg.groupId);

            return true;

        case "extractArchiveAll":
            await extractArchiveAll(document);

            return true;

        case "extractArchiveToFolder":
            await extractArchiveToFolder(document);

            return true;

        case "addArchiveFile":
            await addArchiveFile(document, msg.groupId, reload, readSettings);

            return true;

        case "createArchiveFolder":
            await createArchiveFolder(document, msg.groupId, reload, readSettings);

            return true;

        case "deleteArchiveEntry":
            await deleteArchiveEntry(document, msg.entryId, reload, readSettings);

            return true;

        case "deleteArchiveFolder":
            await deleteArchiveFolder(document, msg.groupId, reload, readSettings);

            return true;

        default:
            return false;
    }
}

async function selectArchive(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    filePath: string,
    readSettings: () => Settings
): Promise<void> {
    const archiveVault = document.archive;

    if (!archiveVault) {
        return;
    }

    const selectedArchive = archiveVault.archives.find(archive => sameFilePath(archive.filePath, filePath));

    if (!selectedArchive) {
        vscode.window.showErrorMessage("SATO: selected archive was not found.");

        return;
    }

    if (sameFilePath(archiveVault.selectedArchivePath, selectedArchive.filePath)) {
        return;
    }

    archiveVault.selectedArchivePath = selectedArchive.filePath;
    archiveVault.tree = selectedArchive.tree;
    archiveVault.stats = selectedArchive.stats;
    archiveVault.inspection = selectedArchive.inspection;
    archiveVault.selectedEntryId = selectedArchive.selectedEntryId;
    archiveVault.password = selectedArchive.password;

    const archiveList = archiveVault.archives.map(
        archive => ({
            fileName: archive.fileName,
            filePath: archive.filePath,
            entryCount: archive.inspection.entryCount,
            encrypted: archive.inspection.encrypted,
            selected: sameFilePath(archive.filePath, selectedArchive.filePath)
        })
    );

    await panel.webview.postMessage({
        type: "vaultState",

        state: {
            tree: archiveVault.tree,
            stats: archiveVault.stats,
            settings: readSettings(),
            selectedEntryId: archiveVault.selectedEntryId || null,
            readOnlyVault: true,
            vaultFormat: "archive",
            archives: archiveList,
            selectedArchivePath: archiveVault.selectedArchivePath
        }
    });

    if (selectedArchive.inspection.encrypted && !selectedArchive.password) {
        setTimeout(() => {void panel.webview.postMessage({type: "openArchiveUnlock"});}, 100);
    }
}

async function prepareArchiveUnlock(
    document: VaultDocument,
    panel: vscode.WebviewPanel
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    if (!archive.inspection.encrypted) {
        vscode.window.showInformationMessage("SATO: the archive is not password-protected.");

        return;
    }

    panel.webview.postMessage({type: "openArchiveUnlock"});
}

async function unlockArchive(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    password: string
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    if (!password) {
        panel.webview.postMessage({type: "archiveUnlockFailed", message: "Enter the archive password."});

        return;
    }

    try {
        const archiveFilePath = selectedArchivePath(document);

        if (!archiveFilePath) {
            return;
        }

        const valid = await testEncryptedZipPassword(archiveFilePath, password);

        if (!valid) {
            panel.webview.postMessage({type: "archiveUnlockFailed", message: "Wrong archive password."});

            return;
        }

        archive.password = password;
        syncSelectedArchivePassword(document);
        await panel.webview.postMessage({type: "archiveUnlocked"});
        vscode.window.setStatusBarMessage("SATO: archive unlocked", 2000);

    } catch (error) {
        panel.webview.postMessage({type: "archiveUnlockFailed", message: "Failed to unlock archive: " + describeError(error)});
    }
}

async function lockArchive(
    document: VaultDocument,
    panel: vscode.WebviewPanel
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    archive.password = undefined;
    syncSelectedArchivePassword(document);
    await panel.webview.postMessage({type: "archiveLocked"});
    vscode.window.setStatusBarMessage("SATO: archive locked", 2000);
}

async function prepareArchivePasswordSet(
    document: VaultDocument,
    panel: vscode.WebviewPanel
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    if (archive.inspection.encrypted) {vscode.window.showInformationMessage("SATO: the archive is already password-protected.");

        return;
    }

    await panel.webview.postMessage({type: "openArchivePasswordChange"});
}

async function prepareArchivePasswordChange(
    document: VaultDocument,
    panel: vscode.WebviewPanel
): Promise<void> {
    const archive = document.archive;

    if (!archive?.inspection.encrypted) {
        vscode.window.showInformationMessage("SATO: the archive is not password-protected.");

        return;
    }

    if (!archive.password) {
        vscode.window.showWarningMessage("SATO: unlock the archive before changing its password.");

        return;
    }

    await panel.webview.postMessage({type: "openArchivePasswordChange"});
}

async function changeArchivePassword(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    newPassword: string,
    reload: () => Promise<void>,
    readSettings: () => Settings
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    const archiveFilePath = archive.selectedArchivePath;

    if (archive.inspection.encrypted && !archive.password) {
        await panel.webview.postMessage({type: "archivePasswordChangeFailed", message: "Unlock the archive before changing its password."});

        return;
    }

    if (!newPassword) {
        await panel.webview.postMessage({type: "archivePasswordChangeFailed", message: "Enter a new archive password."});

        return;
    }

    const currentPassword = archive.password || "";

    try {
        await changeZipPassword(archiveFilePath, { currentPassword, newPassword, createBackup: readSettings().createArchiveBackups});

        await reload();

        if (document.archive) {
            document.archive.password = newPassword;
        }
        syncSelectedArchivePassword(document);
        await panel.webview.postMessage({type: "archivePasswordChanged"});
        vscode.window.showInformationMessage("SATO: archive password changed.");

    } catch (error) {
        await panel.webview.postMessage({type: "archivePasswordChangeFailed", message: "Failed to change the archive password: " + describeError(error)});
    }
}

async function deleteArchivePassword(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    reload: () => Promise<void>,
    readSettings: () => Settings
): Promise<void> {
    const archive = document.archive;

    if (!archive?.password) {
        vscode.window.showWarningMessage("SATO: unlock the archive before removing its password.");

        return;
    }

    const archiveFilePath = archive.selectedArchivePath;
    const answer = await vscode.window.showWarningMessage("Remove password protection from this archive?", {modal: true}, "Remove Password");

    if (answer !== "Remove Password") {
        return;
    }

    const currentPassword = archive.password || "";

    try {
        await changeZipPassword(archiveFilePath, {currentPassword, newPassword: undefined, createBackup: readSettings().createArchiveBackups});
        await reload();

        if (document.archive) {
           document.archive.password = undefined;
            syncSelectedArchivePassword(document);
        }

        await panel.webview.postMessage({type: "archiveLocked"});
        vscode.window.showInformationMessage("SATO: archive password removed.");

    } catch (error) {
        vscode.window.showErrorMessage("SATO: failed to remove archive password - " + describeError(error));
    }
}

async function previewArchiveEntry(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    entryId: string
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    const index = archiveEntryIndex(entryId);
    const entry = archive.inspection.entries[index];

    if (!entry || entry.type !== "file") {
        await panel.webview.postMessage({
            type: "archivePreview",
            entryId,
            kind: "error",
            message: "Archive file entry was not found."
        });

        return;
    }

    if (archive.inspection.encrypted && !archive.password) {
        await panel.webview.postMessage({
            type: "archivePreview",
            entryId,
            kind: "error",
            message: "Unlock the archive to preview this file."
        });

        return;
    }

    const result = await previewZipEntry(archive.selectedArchivePath, entry.path, archive.password);
    await panel.webview.postMessage({type: "archivePreview", entryId, ...result});
}

async function extractArchiveEntry(
    document: VaultDocument,
    entryId: string
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    const entryIndex = archiveEntryIndex(entryId);
    const entry = archive.inspection.entries[entryIndex];

    if (!entry || entry.type !== "file") {
        vscode.window.showErrorMessage("SATO: archive file entry was not found.");

        return;
    }

    const destination = await selectExtractionDirectory("SATO - Extract Archive File");

    if (!destination) {
        return;
    }

    await runExtraction(document, destination, new Set([entry.path]));
}

async function extractArchiveFolder(
    document: VaultDocument,
    groupId: string
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    const folderPath = archiveGroupPath(groupId);

    if (!folderPath) {
        vscode.window.showErrorMessage("SATO: archive folder was not found.");

        return;
    }

    const normalizedPrefix = folderPath.replace(/\/+$/, "") + "/";
    const selectedPaths = new Set(archive.inspection.entries.filter(entry => entry.path.replace(/\\/g, "/").startsWith(normalizedPrefix)).map(entry => entry.path));

    if (selectedPaths.size === 0) {
        vscode.window.showInformationMessage("SATO: the selected archive folder is empty.");

        return;
    }

    const destination = await selectExtractionDirectory("SATO - Extract Archive Folder");

    if (!destination) {
        return;
    }

    await runExtraction(document, destination, selectedPaths);
}

async function extractArchiveAll(
    document: VaultDocument
): Promise<void> {
    const destination = await selectExtractionDirectory("SATO - Extract All Archive Files");

    if (!destination) {
        return;
    }

    await runExtraction(document, destination);
}

async function extractArchiveToFolder(
    document: VaultDocument
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    const archiveDirectory = pathDirectoryName(archive.selectedArchivePath);
    const folderName = archiveExtractionFolderName(archive.inspection.fileName);
    const destination = joinFilePath(archiveDirectory, folderName);

    await runExtraction(document, destination);
}

async function selectExtractionDirectory(
    title: string
): Promise<string | undefined> {
    const selected = await vscode.window.showOpenDialog({title, canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: "Extract Here"});

    return selected?.[0]?.fsPath;
}

async function runExtraction(
    document: VaultDocument,
    destinationDirectory: string,
    selectedPaths?: ReadonlySet<string>
): Promise<void> {
    try {

        const archive = document.archive;

        if (!archive) {
            return;
        }

        const archiveFilePath = selectedArchivePath(document);

        if (!archiveFilePath) {
            return;
        }

        const result = archive.inspection.encrypted
                ? await extractEncryptedZipArchive(archiveFilePath, destinationDirectory, archive.password || "", selectedPaths)
                : await extractZipArchive(archiveFilePath, destinationDirectory, selectedPaths);

        const extractedCount = result.extractedFiles.length;
        vscode.window.showInformationMessage(extractedCount === 1 ? "SATO: 1 file extracted." : `SATO: ${extractedCount} files extracted.`);

    } catch (error) {
        vscode.window.showErrorMessage("SATO: archive extraction failed - " + describeError(error));
    }
}

function archiveEntryIndex(
    entryId: string
): number {
    const prefix = "archive-entry-";

    if (!entryId.startsWith(prefix)) {
        return -1;
    }

    const index = Number.parseInt(entryId.slice(prefix.length), 10);

    return Number.isInteger(index) ? index : -1;
}

function archiveGroupPath(
    groupId: string
): string {
    const prefix = "archive-group-";

    if (!groupId.startsWith(prefix)) {
        return "";
    }

    return groupId.slice(prefix.length).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

async function showArchiveEntryInfo(
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    entryId: string
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    const index = archiveEntryIndex(entryId);
    const entry = archive.inspection.entries[index];

    if (!entry) {
        return;
    }

    const rows: [string, string][] = [
        ["File name", archiveEntryName(entry.path)],
        ["Type", archiveEntryTypeLabel(entry.type)],
        ["Archive", archive.inspection.fileName],
        ["Internal path", entry.path],
        ["Compression method", entry.compressionMethod || ""],
        ["Compressed size", entry.compressedSize !== undefined ? `${entry.compressedSize} bytes` : ""],
        ["Uncompressed size", `${entry.uncompressedSize} bytes`],
        ["Compression ratio", entry.compressionRatio !== undefined ? `${entry.compressionRatio.toFixed(2)}:1` : ""],
        ["CRC-32", entry.crc32 || ""],
        ["Modified", entry.modifiedAt || ""],
        ["Encrypted", entry.encrypted ? "Yes" : "No"],
        ["Archive path", archive.inspection.filePath]
    ].filter((row): row is [string, string] => row[1] !== "");

    const sent = await panel.webview.postMessage({type: "dbInfo", info: {title: "Archive File Info", rows}});

    if (!sent) {
        console.error("SATO: failed to send Archive File Info to the webview.");
    }
}

async function showArchiveInfo(
    document: VaultDocument,
    panel: vscode.WebviewPanel
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    const inspection = archive.inspection;
    const fileCount = inspection.entries.filter(entry => entry.type === "file").length;
    const directoryCount = inspection.entries.filter(entry => entry.type === "directory").length;
    const encryptedEntryCount = inspection.entries.filter(entry => entry.encrypted).length;
    const totalCompressedSize = inspection.entries.reduce((total, entry) => total + (entry.compressedSize ?? 0), 0);
    const compressionRatio = totalCompressedSize > 0 ? inspection.totalUncompressedSize / totalCompressedSize : undefined;

    const rows: [string, string][] = [
        ["File name", inspection.fileName],
        ["Format", archiveFormatLabel(inspection.format)],
        ["Status", inspection.encrypted ? "Encrypted" : "Not encrypted"],
        ["Files", String(fileCount)],
        ["Folders", String(directoryCount)],
        ["Entries", String(inspection.entryCount)],
        ["Encrypted entries", String(encryptedEntryCount)],
        ["File size", `${inspection.fileSize} bytes`],
        ["Compressed size", `${totalCompressedSize} bytes`],
        ["Uncompressed size", `${inspection.totalUncompressedSize} bytes`],
        ["Compression ratio", compressionRatio !== undefined ? `${compressionRatio.toFixed(2)}:1`: ""],
        ["Warnings", inspection.warnings.length > 0 ? inspection.warnings.join("\n") : "None"],
        ["File path", inspection.filePath]
    ].filter((row): row is [string, string] => row[1] !== "");

    const sent = await panel.webview.postMessage({type: "dbInfo", info: {title: "Archive Info", rows}});

    if (!sent) {
        console.error("SATO: failed to send Archive Info to the webview.");
    }
}

async function copyArchivePath(
    document: VaultDocument,
    groupId: string
): Promise<void> {
    const archive = document.archive;

    if (!archive) {
        return;
    }

    const value = groupId === "archive-root" ? archive.inspection.filePath : archiveGroupPath(groupId);

    if (!value) {
        return;
    }

    await vscode.env.clipboard.writeText(value);
    vscode.window.setStatusBarMessage("SATO: path copied", 2000);
}

function archiveEntryName(
    entryPath: string
): string {
    const normalized = entryPath.replace(/\\/g, "/");
    const segments = normalized.split("/").filter(Boolean);

    return segments.at(-1) || entryPath;
}

function archiveEntryTypeLabel(
    type: | "file" | "directory" | "symlink" | "hardlink"| "other"
): string {
    switch (type) {
        case "file":
            return "File";

        case "directory":
            return "Directory";

        case "symlink":
            return "Symbolic Link";

        case "hardlink":
            return "Hard Link";

        case "other":
            return "Other";
    }
}

function archiveFormatLabel(
    format: string
): string {
    switch (format) {
        case "zip":
            return "ZIP";

        case "7z":
            return "7-Zip";

        case "tar":
            return "TAR";

        case "tar-gzip":
            return "TAR.GZ";

        case "tar-bzip2":
            return "TAR.BZ2";

        case "tar-xz":
            return "TAR.XZ";

        case "gzip":
            return "GZip";

        case "bzip2":
            return "BZip2";

        case "xz":
            return "XZ";

        default:
            return format.toUpperCase();
    }
}

async function addArchiveFile(
    document: VaultDocument,
    groupId: string,
    reload: () => Promise<void>,
    readSettings: () => Settings
): Promise<void> {
    if (!canEditArchive(document)) {
        return;
    }

    const selected = await vscode.window.showOpenDialog({
        title: "SATO - Add File to Archive",
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: "Add"
    });

    const source = selected?.[0];

    if (!source) {
        return;
    }

    const folderPath = archiveGroupPath(groupId);
    const internalPath = [folderPath, pathBaseName(source.fsPath)].filter(Boolean).join("/");

    await runArchiveEdit(document, { type: "addFile", sourcePath: source.fsPath, archivePath: internalPath }, reload, readSettings().createArchiveBackups);
}

async function createArchiveFolder(
    document: VaultDocument,
    groupId: string,
    reload: () => Promise<void>,
    readSettings: () => Settings
): Promise<void> {
    if (!canEditArchive(document)) {
        return;
    }

    const folderName = await vscode.window.showInputBox({
        title: "SATO - Create Archive Folder",
        prompt: "Enter a folder name",
        placeHolder: "New Folder",
        ignoreFocusOut: true,
        validateInput: value => {
            const normalized = value.trim();

            if (!normalized) {
                return "Folder name is required.";
            }

            if (normalized.includes("/") || normalized.includes("\\") || normalized === "." || normalized === "..") {
                return "Enter a single folder name without path separators.";
            }

            return undefined;
        }
    });

    if (!folderName) {
        return;
    }

    const parentPath = archiveGroupPath(groupId);
    const internalPath = [parentPath, folderName.trim()].filter(Boolean).join("/");

    await runArchiveEdit(document, {type: "createFolder", archivePath: internalPath}, reload, readSettings().createArchiveBackups);
}

async function deleteArchiveEntry(
    document: VaultDocument,
    entryId: string,
    reload: () => Promise<void>,
    readSettings: () => Settings
): Promise<void> {
    if (!canEditArchive(document)) {
        return;
    }

    const archive = document.archive;

    if (!archive) {
        return;
    }

    const index = archiveEntryIndex(entryId);
    const entry = archive.inspection.entries[index];

    if (!entry || entry.type !== "file") {
        vscode.window.showErrorMessage("SATO: archive file entry was not found.");

        return;
    }

    const answer = await vscode.window.showWarningMessage(`Delete "${entry.path}" from the archive?`, {modal: true}, "Delete");

    if (answer !== "Delete") {
        return;
    }

    await runArchiveEdit(document, { type: "deleteEntry", archivePath: entry.path }, reload, readSettings().createArchiveBackups);
}

async function deleteArchiveFolder(
    document: VaultDocument,
    groupId: string,
    reload: () => Promise<void>,
    readSettings: () => Settings
): Promise<void> {
    if (!canEditArchive(document)) {
        return;
    }

    const folderPath = archiveGroupPath(groupId);

    if (!folderPath) {
        vscode.window.showErrorMessage("SATO: the archive root cannot be deleted.");

        return;
    }

    const answer = await vscode.window.showWarningMessage(`Delete folder "${folderPath}" and all its contents?`, {modal: true}, "Delete");

    if (answer !== "Delete") {
        return;
    }

    await runArchiveEdit(document, { type: "deleteFolder", archivePath: folderPath}, reload, readSettings().createArchiveBackups);
}

function canEditArchive(
    document: VaultDocument
): boolean {
    const archive = document.archive;

    if (!archive) {
        return false;
    }

    if (archive.inspection.encrypted) {
        vscode.window.showWarningMessage("SATO: editing password-protected ZIP archives " + "will be added in the next step.");

        return false;
    }

    return true;
}

async function runArchiveEdit(
    document: VaultDocument,
    operation: Parameters<typeof editZipArchive>[1],
    reload: () => Promise<void>,
    createBackup: boolean
): Promise<void> {
    try {
        const archiveFilePath = selectedArchivePath(document);

        if (!archiveFilePath) {
            return;
        }

        await editZipArchive(archiveFilePath, operation, {createBackup});
        await reload();

        vscode.window.showInformationMessage("SATO: archive updated successfully.");

    } catch (error) {
        vscode.window.showErrorMessage("SATO: failed to update archive - " + describeError(error));
    }
}

function pathBaseName(
    filePath: string
): string {
    return filePath.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) || "";
}

function archiveExtractionFolderName(
    archiveName: string
): string {
    const lowerName = archiveName.toLowerCase();

    if (lowerName.endsWith(".zip.bak")) {
        return archiveName.slice(0, -8);
    }

    if (lowerName.endsWith(".zip")) {
        return archiveName.slice(0, -4);
    }

    return archiveName;
}

function pathDirectoryName(
    filePath: string
): string {
    const normalized = filePath.replace(/\\/g, "/");
    const separator = normalized.lastIndexOf("/");

    return separator >= 0 ? normalized.slice(0, separator) : ".";
}

function joinFilePath(
    directory: string,
    child: string
): string {
    const separator = process.platform === "win32" ? "\\" : "/";

    return directory.endsWith("/") || directory.endsWith("\\") ? `${directory}${child}` : `${directory}${separator}${child}`;
}

function sameFilePath(
    left: string,
    right: string
): boolean {
    const normalize = (
        value: string
    ): string => {
        const normalized = value.replace(/\\/g, "/");

        return process.platform === "win32" ? normalized.toLowerCase() : normalized;
    };

    return normalize(left) === normalize(right);
}

function selectedArchivePath(
    document: VaultDocument
): string | undefined {
    return document.archive?.selectedArchivePath;
}

function syncSelectedArchivePassword(
    document: VaultDocument
): void {
    const archiveVault = document.archive;

    if (!archiveVault) {
        return;
    }

    const selectedArchive = archiveVault.archives.find(archive => sameFilePath(archive.filePath, archiveVault.selectedArchivePath));

    if (selectedArchive) {
        selectedArchive.password = archiveVault.password;
    }
}
