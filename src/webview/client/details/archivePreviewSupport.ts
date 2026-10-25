import type { ClientEntry } from "../types";

const TEXT_EXTENSIONS = new Set([
    ".txt", ".md", ".log", ".json", ".jsonc", ".xml",
    ".yaml", ".yml", ".csv", ".tsv", ".ini", ".conf",
    ".config", ".env", ".properties", ".html", ".htm",
    ".css", ".scss", ".less", ".js", ".mjs", ".cjs",
    ".ts", ".tsx", ".jsx", ".py", ".sh", ".bash",
    ".zsh", ".ps1", ".bat", ".java", ".sql",  ".go",
    ".h", ".cpp", ".hpp", ".cs", ".cmd", ".rs", ".c",
     ".rb", ".php", ".swift", ".kt", ".kts", ".toml"
]);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);

export function hasArchiveInfoTab(
    entry: ClientEntry
): boolean {
    return entry.readOnly === true;
}

export function hasArchivePreviewTab(
    entry: ClientEntry
): boolean {
    const format = entry.values?.Format || "";

    if (format === "DEB Package" || format === "RPM Package") {
        return entry.values?.Type === "File";
    }

    const fileName = entry.values?.File || entry.title;
    const extension = fileExtension(fileName);

    return (TEXT_EXTENSIONS.has(extension) || IMAGE_EXTENSIONS.has(extension));
}

function fileExtension(
    fileName: string
): string {
    const normalized = fileName.toLowerCase();
    const slashIndex = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
    const dotIndex = normalized.lastIndexOf(".");

    if (dotIndex <= slashIndex) {
        return "";
    }

    return normalized.slice(dotIndex);
}
