import { byId } from "./dom";
import { countCryptoEmptyValues } from "./details/emptyValues";
import { DAY_MILLISECONDS, parseDateTimestamp } from "./dateFormat";
import { app, entryIndex, isCryptoFileView, isReadOnlyVault, vaultFormat } from "./state";

export function renderStatus(): void {
    const bar = byId<HTMLElement>("statusbar");

    bar.innerHTML = "";

    if (app.settings && app.settings.showStatusBar === false) {
        bar.style.display = "none";
        return;
    }

    bar.style.display = "";

    const item = (
        label: string,
        value: string | number,
        className = "",
        suffix = "",
        suffixClassName = "",
        title = ""
    ): void => {
        const element = document.createElement("span");
        element.className = "item" + (className ? ` ${className}` : "");

        const labelElement = document.createElement("strong");
        labelElement.className = "status-label";
        labelElement.textContent = label + ":";

        const valueElement = document.createElement("span");
        valueElement.className = "status-value";
        valueElement.textContent = String(value);

        if (title) {
            valueElement.title = title;
        }

        element.appendChild(labelElement);
        element.appendChild(valueElement);

        if (suffix) {
            const suffixElement = document.createElement("strong");
            suffixElement.className = "validity-days" + (suffixClassName ? ` ${suffixClassName}` : "");
            suffixElement.textContent = suffix;
            element.appendChild(suffixElement);
        }

        bar.appendChild(element);
    };

    if (isCryptoFileView()) {
        renderCryptoStatus(item);
        return;
    }

    if (vaultFormat() === "archive") {
        renderArchiveStatus(item);
        return;
    }

    const stats = app.state.stats;

    if (isReadOnlyVault()) {
        item("Format", formatVaultName(vaultFormat()));
        item("Mode", "read-only");
        item("Groups", stats.groups);
        item("Entries", stats.entries);
        item("Duplicates", stats.duplicates, stats.duplicates > 0 ? "warn" : "");
        item("Weak", stats.weak, stats.weak > 0 ? "warn" : "");

        return;
    }

    item("Groups", stats.groups);
    item("Entries", stats.entries);
    item("Duplicates", stats.duplicates, stats.duplicates > 0 ? "warn" : "");
    item("Weak", stats.weak, stats.weak > 0 ? "warn" : "");
    item("Expired", stats.expired, stats.expired > 0 ? "err" : "");
    item("Empty groups", stats.emptyGroups );
}

function renderArchiveStatus(
    item: (label: string, value: string | number, className?: string, suffix?: string, suffixClassName?: string, title?: string) => void
): void {
    const summary = collectArchiveStatus(app.state.tree);
    const selectedArchive = app.state.archives?.find(archive => archive.filePath === app.state.selectedArchivePath);
    const formatLabel = selectedArchive?.formatLabel || "ZIP";
    const editable = selectedArchive?.editable === true;

    item("Format", formatLabel);
    const containerLabel = archiveContainerLabel(formatLabel);

    if (containerLabel) {
        item("Container", containerLabel);
    }

    item("Mode", editable ? "Editable" : "Read-only");
    if (selectedArchive?.backup) {
        item("Backup", "Yes");
    }
    item("Files", summary.files);
    item("Folders", summary.folders);
    item("Packed", formatCompactBytes(summary.packed), "", "", "", `${summary.packed} bytes`);
    item("Unpacked", formatCompactBytes(summary.unpacked), "", "", "", `${summary.unpacked} bytes`);
    item("Ratio", summary.packed > 0 ? `${(summary.unpacked / summary.packed).toFixed(2)}:1` : "N/A");

    if (summary.encrypted) {
        item("Protection", "Encrypted", "warn");
        item("Status", app.archiveUnlocked ? "Unlocked" : "Locked", app.archiveUnlocked ? "success" : "warn");

    } else {
        item("Protection", "None");
    }
}

function renderCryptoStatus(
    item: (label: string, value: string | number, className?: string, suffix?: string, suffixClassName?: string) => void
): void {
    const entry = app.selectedEntryId ? entryIndex.get(app.selectedEntryId) : undefined;
    const values = entry?.values || {};

    item("Type", values.Type || "Crypto file");

    if (values.Status) {
        item("Status", values.Status, statusClass(values.Status));
    }

    if (values.Algorithm) {
        item("Algorithm", values.Algorithm);
    }

    if (values["Key size"]) {
        item("Key size", values["Key size"]);
    }

    if (values["Key Size"]) {
        item("Key size", values["Key Size"]);
    }

    if (values.Curve) {
        item("Curve", values.Curve);
    }

    if (values["Valid to"]) {
        const validity = formatCertificateValidity( values["Valid to"]);
        const validityClass = validity.expired ? "err" : validity.days <= 30 ? "warn" : "success";
        item("Valid to", validity.date, "", validity.message, validityClass);
    }

    if (values["Public key algorithm"]) {
        item("Public key", values["Public key algorithm"]);
    }

    if (values["Public Key Algorithm"]) {
        item("Public key", values["Public Key Algorithm"]);
    }

    if (entry) {
        item("Empty values", countCryptoEmptyValues(entry));
    }
}

function statusClass(
    status: string
): string {
    const normalized = status.toLowerCase();

    if (normalized.includes("failed") || normalized.includes("error")) {
        return "err";
    }

    if (normalized === "locked" || normalized === "encrypted") {
        return "warn";
    }

    return "";
}

function formatVaultName(
    format: string
): string {
    switch (format) {
        case "1pif": return "1PIF";
        case "bcup": return "Buttercup";
        case "opvault": return "OPVault";
        case "agilekeychain": return "Agile Keychain";
        case "kdb": return "KeePass 1.x";
        default: return format || "Imported vault";
    }
}

function formatCertificateValidity(
    value: string
): {
    date: string;
    message: string;
    expired: boolean;
    days: number;
} {
    const expirationTime = parseDateTimestamp(value);

    if (expirationTime === undefined) {
        return {date: value, message: "", expired: false, days: Number.POSITIVE_INFINITY};
    }

    const difference = expirationTime - Date.now();

    if (difference < 0) {
        const daysAgo = Math.max(1, Math.floor(Math.abs(difference) / DAY_MILLISECONDS));

        return {
            date: value,
            message: daysAgo === 1 ? "(1 day ago)" : `(${daysAgo} days ago)`,
            expired: true,
            days: daysAgo
        };
    }

    const daysLeft = Math.ceil(difference / DAY_MILLISECONDS);

    return {
        date: value,
        message: daysLeft === 0 ? "(expires today)" : daysLeft === 1 ? "(1 day left)" : `(${daysLeft} days left)`,
        expired: false,
        days: daysLeft
    };
}

function collectArchiveStatus(
    root: typeof app.state.tree
): {
    files: number;
    folders: number;
    packed: number;
    unpacked: number;
    encrypted: boolean;
} {
    let files = 0;
    let folders = 0;
    let packed = 0;
    let unpacked = 0;
    let encrypted = false;

    const walk = (group: typeof app.state.tree, isRoot: boolean): void => {
        if (!isRoot) {
            folders++;
        }

        for (const entry of group.entries) {
            files++;
            packed += parseByteValue(entry.values?.["Compressed size"]);
            unpacked += parseByteValue(entry.values?.["Uncompressed size"]);

            if (entry.values?.Encrypted === "Yes") {
                encrypted = true;
            }
        }

        for (const child of group.groups) {
            walk(child, false);
        }
    };

    walk(root, true);
    return {files, folders, packed, unpacked, encrypted};
}

function parseByteValue(
    value: string | undefined
): number {
    if (!value) {
        return 0;
    }

    const match = value.match(/[\d,.]+/);

    if (!match) {
        return 0;
    }

    const parsed = Number(match[0].replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompactBytes(
    bytes: number
): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${( bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function archiveContainerLabel(
    formatLabel: string
): string {
    if (formatLabel === "TAR.GZ" || formatLabel === "TAR.BZ2" ||
        formatLabel === "TAR.XZ" || formatLabel === "TAR.ZST" ||
        formatLabel === "TAR.Z") {
        return "TAR";
    }

    if (formatLabel === "DMG Disk Image") {
        return "DMG Disk Image";
    }

    const standaloneFormats = new Set(["ZIP", "ZIPX", "7-Zip", "RAR",
        "ALZip", "EGG", "TAR", "GZip", "BZip2", "XZ", "Zstandard", "LZMA", "Unix Compress",
        "LZH Archive", "LHA Archive", "ARJ Archive", "XAR Archive", "Compiled HTML Help",
        "Compiled Help Index", "CAB Archive", "CPIO Archive", "AR Archive", "Static Library",
        "DEB Package", "RPM Package"
    ]);

    return standaloneFormats.has(formatLabel) ? "" : "ZIP";
}
