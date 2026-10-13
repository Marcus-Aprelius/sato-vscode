export type AppTheme = | "vscode" | "dark" | "gray" | "light";
export type FileCategoryFilter = | "all" | "vaults" | "archives" | "ssh" | "crypto";

export interface Settings {
    autoLockTimeout: number;
    clipboardClearTimeout: number;
    passwordGeneratorLength: number;
    confirmBeforeDelete: boolean;
    showPasswordsByDefault: boolean;
    showEmptyValuesByDefault: boolean;
    showStatusBar: boolean;
    createArchiveBackups: boolean;
    theme: AppTheme;
    fileCategoryFilters: FileCategoryFilter[];
}

export interface SupportedFileListItem {
    fileName: string;
    filePath: string;
    category: Exclude<FileCategoryFilter, "all">;
    selected: boolean;
    entryCount?: number;
    encrypted?: boolean;
    formatLabel?: string;
    editable?: boolean;
    passwordEditable?: boolean;
    backup?: boolean;
}

export type ArchiveListItem = SupportedFileListItem;
