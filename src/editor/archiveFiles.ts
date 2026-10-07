import * as path from "path";
import * as vscode from "vscode";

import { inspectArchive } from "../archives";
import { describeError} from "../utils/errors";

import type { VaultDocument } from "../types";
import type { GroupView, VaultStats } from "../vault";
import type { ArchiveEntry, ArchiveFile, ArchiveInspection, ArchiveVault } from "../archives";


export async function openArchiveFile(
    document: VaultDocument
): Promise<boolean> {
    const previousSelectedArchivePath = document.archive?.selectedArchivePath;
    const previousPasswords = collectArchivePasswords(document.archive);

    try {
        const archives = await readArchivesFromDirectory(document.uri, previousPasswords);
        const selectedArchive = findSelectedArchive(archives, previousSelectedArchivePath || document.uri.fsPath);

        if (!selectedArchive) {
            vscode.window.showErrorMessage("SATO: the selected archive could not be opened.");

            return false;
        }

        document.db = undefined;
        document.credentials = undefined;
        document.psafe = undefined;
        document.certificate = undefined;
        document.importedVault = undefined;
        document.archive = createArchiveVault(archives, selectedArchive);

        return true;

    } catch (error) {
        vscode.window.showErrorMessage("SATO: failed to open archive - " + describeError(error));

        return false;
    }
}

async function readArchivesFromDirectory(
    selectedUri: vscode.Uri,
    previousPasswords: ReadonlyMap<string, string>
): Promise<ArchiveFile[]> {
    const directoryUri = vscode.Uri.file(path.dirname(selectedUri.fsPath));

    let directoryEntries: [string, vscode.FileType][];

    try {
        directoryEntries = await vscode.workspace.fs.readDirectory(directoryUri);

    } catch {
        directoryEntries = [];
    }

    const archiveUris = directoryEntries
        .filter(([name, fileType]) => fileType === vscode.FileType.File && isSupportedArchiveName(name))
        .map(([name]) => vscode.Uri
        .joinPath(directoryUri, name));

    if (!archiveUris.some(uri => sameFilePath(uri.fsPath, selectedUri.fsPath))) {
        archiveUris.push(selectedUri);
    }

    archiveUris.sort((left, right) => left.fsPath.localeCompare(right.fsPath, undefined, {sensitivity: "base"}));

    const archives: ArchiveFile[] = [];

    for (const uri of archiveUris) {
        try {
            const inspection = await inspectArchive(uri.fsPath);
            const archiveFile = createArchiveFile(inspection);

            archiveFile.password = previousPasswords.get(normalizeFilePath(uri.fsPath));
            archives.push(archiveFile);

        } catch (error) {
            if (sameFilePath(uri.fsPath, selectedUri.fsPath)) {
                throw error;
            }

            console.warn("SATO: skipped unreadable archive:", uri.fsPath, describeError(error));
        }
    }

    return archives;
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
    selectedArchive: ArchiveFile
): ArchiveVault {
    return {
        archives,
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
    return (
        archives.find(archive => sameFilePath(archive.filePath, selectedPath)) || archives[0]
    );
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

function isSupportedArchiveName(
    fileName: string
): boolean {
    const normalized = fileName.toLowerCase();

    return (normalized.endsWith(".zip") || normalized.endsWith(".zip.bak"));
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
            Format: "ZIP",
            Archive: inspection.fileName,
            File: archiveEntry.path,
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

function createArchiveStats(
    root: GroupView
): VaultStats {
    let groups = 0;
    let entries = 0;
    let emptyGroups = 0;

    const walk = (
        group: GroupView,
        isRoot: boolean
    ): void => {
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
