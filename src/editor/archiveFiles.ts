import * as path from "path";
import * as vscode from "vscode";

import { inspectArchive, archiveFormatLabel } from "../archives";
import { describeError} from "../utils/errors";
import { supportedFileCategory } from "../fileFormats";
import { SevenZipUnavailableError } from "../archives/sevenZipCli";
import { UneggUnavailableError } from "../archives/uneggCli";
import { splitArchivePrimaryPathCandidate } from "../archives/splitArchivePath";

import type { VaultDocument } from "../types";
import type { GroupView, VaultStats } from "../vault";
import type { ArchiveEntry, ArchiveFile, ArchiveInspection, ArchiveVault, SupportedDirectoryFile } from "../archives";

export async function openArchiveFile(
    document: VaultDocument
): Promise<boolean> {
    const previousPasswords = collectArchivePasswords(document.archive);
    const activeUri = document.activeUri ?? document.uri;

    try {
        const directoryFiles = await readSupportedFilesFromDirectory(activeUri, previousPasswords);
        const selectedArchive = findSelectedArchive(directoryFiles.archives, activeUri.fsPath);

            if (!selectedArchive) {
                vscode.window.showErrorMessage("SATO: the selected archive could not be opened.");
                return false;
            }

            document.db = undefined;
            document.credentials = undefined;
            document.psafe = undefined;
            document.certificate = undefined;
            document.importedVault = undefined;
            document.archive = createArchiveVault(directoryFiles.archives, directoryFiles.supportedFiles, selectedArchive);

            return true;

    } catch (error) {
        if (error instanceof SevenZipUnavailableError || error instanceof UneggUnavailableError) {
            return false;
        }

        vscode.window.showErrorMessage("SATO: failed to open archive - " + describeError(error));
        return false;
    }
}

export async function refreshSelectedArchive(
    document: VaultDocument,
    password?: string
): Promise<boolean> {
    const archiveVault = document.archive;

    if (!archiveVault) {
        return false;
    }

    const selectedPath = archiveVault.selectedArchivePath;

    try {
        const inspection = await inspectArchive(selectedPath, undefined, password);
        const refreshedArchive = createArchiveFile(inspection);
        refreshedArchive.password = password;
        const archiveIndex = archiveVault.archives.findIndex(archive => sameFilePath(archive.filePath, selectedPath));

        if (archiveIndex >= 0) {
            archiveVault.archives[archiveIndex] = refreshedArchive;
        }

        archiveVault.tree = refreshedArchive.tree;
        archiveVault.stats = refreshedArchive.stats;
        archiveVault.inspection = refreshedArchive.inspection;
        archiveVault.selectedEntryId = refreshedArchive.selectedEntryId;
        archiveVault.password = password;

        return true;

    } catch (error) {
        vscode.window.showErrorMessage("SATO: failed to refresh archive - " + describeError(error));
        return false;
    }
}

async function readSupportedFilesFromDirectory(
    selectedUri: vscode.Uri,
    previousPasswords: ReadonlyMap<string, string>
): Promise<{
    archives: ArchiveFile[];
    supportedFiles: SupportedDirectoryFile[];
}> {
    const directoryUri = vscode.Uri.file(path.dirname(selectedUri.fsPath));
    let directoryEntries: [string, vscode.FileType][];

    try {
        directoryEntries = await vscode.workspace.fs.readDirectory(directoryUri);

    } catch {
        directoryEntries = [];
    }

    const supportedFiles: SupportedDirectoryFile[] = [];
    const archiveUris: vscode.Uri[] = [];

    /*
     * Additional volumes such as *.vol2.egg and *.a00 must not
     * appear as independent archives in the SATO file list.
     *
     * They may still be opened directly from VS Code. In that case
     * selectedUri is resolved to the primary archive below.
     */
    for (const [name, fileType] of directoryEntries) {
        if (fileType !== vscode.FileType.File) {
            continue;
        }

        const category = supportedFileCategory(name);

        if (!category) {
            continue;
        }

        const uri = vscode.Uri.joinPath(directoryUri, name);

        if (category === "archives") {
            const splitResolution = splitArchivePrimaryPathCandidate(uri.fsPath);

            if (splitResolution.split && !splitResolution.primary) {
                continue;
            }
        }

        supportedFiles.push({fileName: name, filePath: uri.fsPath, category});

        if (category === "archives") {
            archiveUris.push(uri);
        }
    }

    const selectedFileName = path.basename(selectedUri.fsPath);
    const selectedCategory = supportedFileCategory(selectedFileName);

    /*
     * If the user opened an additional volume directly, use its
     * primary volume as the actual selected archive.
     *
     * Examples:
     *
     * split.high.vol2.egg -> split.high.vol1.egg
     * split.a00           -> split.alz
     */
    const selectedArchiveResolution = selectedCategory === "archives" ? splitArchivePrimaryPathCandidate(selectedUri.fsPath): undefined;
    const effectiveSelectedPath = selectedArchiveResolution?.primaryPath ?? selectedUri.fsPath;

    if (selectedCategory === "archives") {
        const effectiveSelectedUri = vscode.Uri.file(effectiveSelectedPath);

        if (!archiveUris.some(uri => sameFilePath(uri.fsPath, effectiveSelectedUri.fsPath))) {
            archiveUris.push(effectiveSelectedUri);
        }
    }

    if (selectedCategory && !supportedFiles.some(file => sameFilePath(file.filePath, effectiveSelectedPath))) {
        supportedFiles.push({ fileName: path.basename(effectiveSelectedPath), filePath: effectiveSelectedPath, category: selectedCategory});
    }

    supportedFiles.sort((left, right) => left.fileName.localeCompare(right.fileName, undefined, {sensitivity: "base"}));
    archiveUris.sort((left, right) => left.fsPath.localeCompare(right.fsPath, undefined, {sensitivity: "base"}));

    const archives: ArchiveFile[] = [];
    const inspectedArchivePaths = new Set<string>();

    for (const uri of archiveUris) {
        try {
            /*
             * A password may have been stored under either the primary
             * archive path or the originally selected additional volume.
             */
            const archiveResolution = splitArchivePrimaryPathCandidate(uri.fsPath);
            const primaryPassword = previousPasswords.get(normalizeFilePath( archiveResolution.primaryPath));
            const requestedPassword = previousPasswords.get(normalizeFilePath(uri.fsPath));

            const selectedVolumePassword = selectedArchiveResolution &&
                sameFilePath(selectedArchiveResolution.primaryPath, archiveResolution.primaryPath )
                ? previousPasswords.get(normalizeFilePath(selectedUri.fsPath))
                : undefined;

            const password = primaryPassword ?? requestedPassword ?? selectedVolumePassword;
            const inspection = await inspectArchive(uri.fsPath, undefined, password);
            const canonicalPath = normalizeFilePath(inspection.filePath);

            /*
             * A primary volume and any additional volumes resolve to
             * the same canonical archive. Add that archive only once.
             */
            if (inspectedArchivePaths.has(canonicalPath)) {
                continue;
            }

            inspectedArchivePaths.add(canonicalPath);
            const archiveFile = createArchiveFile(inspection);
            archiveFile.password = password;
            archives.push(archiveFile);

        } catch (error) {
            const failedResolution = splitArchivePrimaryPathCandidate(uri.fsPath);
            const selectedResolution = splitArchivePrimaryPathCandidate(selectedUri.fsPath);
            const selectedArchiveFailed = sameFilePath(failedResolution.primaryPath, selectedResolution.primaryPath);

            if (selectedArchiveFailed) {
                throw error;
            }

            console.warn("SATO: skipped unreadable archive:", uri.fsPath, describeError(error));
        }
    }

    return {archives, supportedFiles};
}

function createArchiveFile(
    inspection: ArchiveInspection
): ArchiveFile {
    const tree = createArchiveTree(inspection);

    return {
        fileName: inspection.fileName,
        filePath: inspection.filePath,
        inspection,
        tree,
        stats: createArchiveStats(tree),
        selectedEntryId: findFirstEntryId(tree)
    };
}

function createArchiveVault(
    archives: ArchiveFile[],
    supportedFiles: SupportedDirectoryFile[],
    selectedArchive: ArchiveFile
): ArchiveVault {
    return {
        archives,
        supportedFiles,
        selectedArchivePath: selectedArchive.filePath,
        tree: selectedArchive.tree,
        stats: selectedArchive.stats,
        inspection: selectedArchive.inspection,
        selectedEntryId: selectedArchive.selectedEntryId,
        password: selectedArchive.password
    };
}

function findSelectedArchive(
    archives: ArchiveFile[],
    selectedPath: string
): ArchiveFile | undefined {
    const selectedResolution = splitArchivePrimaryPathCandidate(selectedPath);
    const primaryArchive = archives.find(archive => sameFilePath(archive.filePath, selectedResolution.primaryPath));

    if (primaryArchive) {
        return primaryArchive;
    }

    const directlySelectedArchive = archives.find(archive => sameFilePath(archive.filePath, selectedPath));

    if (directlySelectedArchive) {
        return directlySelectedArchive;
    }

    return archives[0];
}

function collectArchivePasswords(
    archiveVault: ArchiveVault | undefined
): Map<string, string> {
    const passwords = new Map<string, string>();

    if (!archiveVault) {
        return passwords;
    }

    for (const archive of archiveVault.archives || []) {
        if (archive.password) {
            passwords.set(normalizeFilePath(archive.filePath), archive.password);
        }
    }

    if (archiveVault.password) {
        passwords.set(normalizeFilePath(archiveVault.inspection.filePath), archiveVault.password);
    }

    return passwords;
}

function sameFilePath(
    left: string,
    right: string
): boolean {
    return (normalizeFilePath(left) === normalizeFilePath(right));
}

function normalizeFilePath(
    filePath: string
): string {
    const normalized = path.resolve(filePath);
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function createArchiveTree(
    inspection: ArchiveInspection
): GroupView {
    const root: GroupView = {
        id: "archive-root",
        parentId: null,
        name: inspection.fileName,
        groups: [],
        entries: []
    };

    const groupsByPath = new Map<string, GroupView>();

    groupsByPath.set("", root);

    for (let index = 0; index < inspection.entries.length; index++) {
        const archiveEntry = inspection.entries[index];
        const normalizedPath = normalizeArchiveEntryPath(archiveEntry.path);

        if (!normalizedPath) {
            continue;
        }

        const segments = normalizedPath.split("/");

        if (archiveEntry.type === "directory") {
            ensureArchiveGroup(root, groupsByPath, segments);
            continue;
        }

        const fileName = segments.pop() || normalizedPath;
        const parent = ensureArchiveGroup(root, groupsByPath, segments);

        parent.entries.push(createArchiveEntryView(inspection, archiveEntry, index, parent.id, fileName));
    }

    sortArchiveGroup(root);
    return root;
}

function ensureArchiveGroup(
    root: GroupView,
    groupsByPath: Map<string, GroupView>,
    segments: string[]
): GroupView {
    let current = root;
    let currentPath = "";

    for (const segment of segments) {
        if (!segment) {
            continue;
        }

        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const existing = groupsByPath.get(currentPath);

        if (existing) {
            current = existing;
            continue;
        }

        const group: GroupView = {id: `archive-group-${currentPath}`, parentId: current.id, name: segment, groups: [], entries: []};

        current.groups.push(group);
        groupsByPath.set(currentPath, group);

        current = group;
    }

    return current;
}

function createArchiveEntryView(
    inspection: ArchiveInspection,
    archiveEntry: ArchiveEntry,
    index: number,
    parentId: string,
    fileName: string
): GroupView["entries"][number] {
    const values:
        Record<string, string> = {
            Type: archiveEntryTypeLabel(archiveEntry),
            Format: archiveDisplayFormat(inspection),
            Archive: inspection.fileName,
            File: archiveEntry.path,
            Details: inspection.details || "",
            Extension: archiveFileExtension(fileName),
            "Compression method": archiveEntry.compressionMethod || "",
            "Compressed size": archiveEntry.compressedSize !== undefined ? `${archiveEntry.compressedSize} bytes` : "",
            "Uncompressed size": `${archiveEntry.uncompressedSize} bytes`,
            "Compression ratio": archiveEntry.compressionRatio !== undefined ? `${archiveEntry.compressionRatio.toFixed(2)}:1` : "",
            "CRC-32": archiveEntry.crc32 || "",
            Modified: archiveEntry.modifiedAt || "",
            Encrypted: archiveEntry.encrypted ? "Yes" : "No",
            "File path": inspection.filePath
        };

    const fields = Object.keys(values).filter(key => values[key] !== "");

    return {
        id: `archive-entry-${index}`,
        parentId,
        title: fileName,
        username: "",
        url: "",
        notes: "",
        passwordLength: 0,
        hasPassword: false,
        weak: false,
        expired: false,
        fields,
        values,
        readOnly: true
    };
}

function archiveDisplayFormat(
    inspection: ArchiveInspection
): string {
    if (inspection.format === "lzh") {
        return inspection.fileName.toLowerCase().endsWith(".lha") ? "LHA Archive" : "LZH Archive";
    }

    if (inspection.format !== "ar") {
        return archiveFormatLabel(inspection.format);
    }

    const lowerFileName = inspection.fileName.toLowerCase();
    
    if (lowerFileName.endsWith(".a") || lowerFileName.endsWith(".lib")) {
        return "Static Library";
    }

    return "AR Archive";
}

function createArchiveStats(
    root: GroupView
): VaultStats {
    let groups = 0;
    let entries = 0;
    let emptyGroups = 0;

    const walk = (group: GroupView, isRoot: boolean): void => {
        if (!isRoot) {
            groups++;
        }

        entries += group.entries.length;

        if (!isRoot && group.groups.length === 0 && group.entries.length === 0) {
            emptyGroups++;
        }

        for (const child of group.groups) {
            walk(child, false);
        }
    };

    walk(root, true);
    return {groups, entries, duplicates: 0, expired: 0, emptyGroups, weak: 0};
}

function findFirstEntryId(
    root: GroupView
): string {
    if (root.entries[0]) {
        return root.entries[0].id;
    }

    for (const group of root.groups) {
        const entryId = findFirstEntryId(group);

        if (entryId) {
            return entryId;
        }
    }

    return "";
}

function normalizeArchiveEntryPath(
    entryPath: string
): string {
    return entryPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function archiveFileExtension(
    fileName: string
): string {
    const extension = fileName.lastIndexOf(".");

    if (extension <= 0 || extension === fileName.length - 1) {
        return "";
    }

    return fileName.slice(extension).toLowerCase();
}

function archiveEntryTypeLabel(
    entry: ArchiveEntry
): string {
    switch (entry.type) {
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

function sortArchiveGroup(
    group: GroupView
): void {
    group.groups.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
    group.entries.sort((left, right) => left.title.localeCompare(right.title, undefined, { sensitivity: "base" }));

    for (const child of group.groups) {
        sortArchiveGroup(child);
    }
}
