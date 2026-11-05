export type AppTheme = | "vscode" | "dark" | "gray" | "light";
export type Base64DefaultFormat = | "base64url" | "base64" | "base32" | "base32hex" | "hex";
export type YamlJsonIndentation = | "spaces-2" | "spaces-4" | "tabs";
export type FileCategoryFilter = | "all" | "vaults" | "archives" | "ssh" | "crypto";
export type Base64DefaultOperation = | "encode" | "decode";
export type YamlJsonDefaultOperation = | "yaml-to-json" | "json-to-yaml";

export interface Settings {
    autoLockTimeout: number;
    clipboardClearTimeout: number;
    passwordGeneratorLength: number;
    confirmBeforeDelete: boolean;
    showPasswordsByDefault: boolean;
    showEmptyValuesByDefault: boolean;
    showStatusBar: boolean;
    createArchiveBackups: boolean;
    base64DefaultFormat: Base64DefaultFormat;
    yamlJsonIndentation: YamlJsonIndentation;
    theme: AppTheme;
    fileCategoryFilters: FileCategoryFilter[];
    base64DefaultOperation: Base64DefaultOperation;
    yamlJsonDefaultOperation: YamlJsonDefaultOperation;
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
