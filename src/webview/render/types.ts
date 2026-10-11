export type AppTheme = | "vscode" | "dark" | "gray" | "light";

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
}

export interface ArchiveListItem {
    fileName: string;
    filePath: string;
    entryCount: number;
    encrypted: boolean;
    selected: boolean;
}
