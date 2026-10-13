import * as path from "path";

import { isSatoBackupFileName, normalizeBackupFileName } from "../fileFormats";
import type { ArchiveFormat } from "./types";

interface ArchiveSuffix {
    suffix: string;
    format: ArchiveFormat;
    label: string;
    editable: boolean;
    passwordEditable?: boolean;
}

const ARCHIVE_SUFFIXES: ReadonlyArray<ArchiveSuffix> = [
    {suffix: ".tar.bz2", format: "tar-bzip2", label: "TAR.BZ2", editable: true},
    {suffix: ".tar.gz", format: "tar-gzip", label: "TAR.GZ", editable: true},
    {suffix: ".tar.xz", format: "tar-xz", label: "TAR.XZ", editable: true},
    {suffix: ".zipx", format: "zipx", label: "ZIPX", editable: true, passwordEditable: true},
    {suffix: ".appxbundle", format: "zip", label: "APPX Bundle", editable: false},
    {suffix: ".mcproject", format: "zip", label: "Minecraft Project", editable: false},
    {suffix: ".mctemplate", format: "zip", label: "Minecraft Template", editable: false},
    {suffix: ".mcaddon",format: "zip", label: "Minecraft Add-on", editable: false},
    {suffix: ".mcpack", format: "zip", label: "Minecraft Pack", editable: false},
    {suffix: ".mcworld", format: "zip", label: "Minecraft World", editable: false},
    {suffix: ".asice", format: "zip", label: "ASiC-E", editable: false},
    {suffix: ".mrpack", format: "zip", label: "Modrinth Pack", editable: false},
    {suffix: ".nupkg", format: "zip", label: "NuGet Package", editable: false},
    {suffix: ".vsix", format: "zip", label: "VSIX", editable: false},
    {suffix: ".xlsx", format: "zip", label: "Excel Workbook", editable: false},
    {suffix: ".epub", format: "zip", label: "EPUB", editable: false},
    {suffix: ".aia", format: "zip", label: "App Inventor Project", editable: false},
    {suffix: ".ear", format: "zip", label: "Java EAR", editable: false},
    {suffix: ".ipa", format: "zip", label: "iOS App Package", editable: false},
    {suffix: ".jar", format: "zip", label: "Java Archive", editable: false},
    {suffix: ".sb2", format: "zip", label: "Scratch 2 Project", editable: false},
    {suffix: ".sb3", format: "zip", label: "Scratch 3 Project", editable: false},
    {suffix: ".war", format: "zip", label: "Java WAR", editable: false},
    {suffix: ".whl", format: "zip", label: "Python Wheel", editable: false},
    {suffix: ".xpi", format: "zip", label: "Mozilla Extension", editable: false},
    {suffix: ".zip", format: "zip", label: "ZIP", editable: true, passwordEditable: true},
    {suffix: ".tgz", format: "tar-gzip", label: "TAR.GZ", editable: true},
    {suffix: ".tbz2", format: "tar-bzip2", label: "TAR.BZ2", editable: true},
    {suffix: ".txz", format: "tar-xz", label: "TAR.XZ", editable: true},
    {suffix: ".7z", format: "7z", label: "7-Zip", editable: true, passwordEditable: true},
    {suffix: ".deb", format: "deb", label: "DEB Package", editable: false},
    {suffix: ".rpm", format: "rpm", label: "RPM Package", editable: false},
    {suffix: ".dmg", format: "dmg", label: "DMG Disk Image", editable: false},
    {suffix: ".alz", format: "alz", label: "ALZip", editable: false},
    {suffix: ".egg", format: "egg", label: "EGG", editable: false},
    {suffix: ".tar", format: "tar", label: "TAR", editable: true},
    {suffix: ".gz", format: "gzip", label: "GZip", editable: false},
    {suffix: ".bz2", format: "bzip2", label: "BZip2", editable: false},
    {suffix: ".xz", format: "xz", label: "XZ", editable: false},
    {suffix: ".pbix", format: "zip", label: "Power BI Report", editable: false},
    {suffix: ".pbit", format: "zip", label: "Power BI Template", editable: false},
    {suffix: ".cpio", format: "cpio", label: "CPIO Archive", editable: false},
    {suffix: ".cab", format: "cab", label: "CAB Archive", editable: false},
    {suffix: ".tar.zst", format: "tar-zstd", label: "TAR.ZST", editable: false},
    {suffix: ".tzst", format: "tar-zstd", label: "TAR.ZST", editable: false},
    {suffix: ".tar.z", format: "tar-compress", label: "TAR.Z", editable: false},
    {suffix: ".taz", format: "tar-compress", label: "TAR.Z", editable: false},
    {suffix: ".lzma", format: "lzma", label: "LZMA", editable: false},
    {suffix: ".zst", format: "zstd", label: "Zstandard", editable: false},
    {suffix: ".z", format: "compress", label: "Unix Compress", editable: false},
    {suffix: ".lzh", format: "lzh", label: "LZH Archive", editable: false},
    {suffix: ".lha", format: "lzh", label: "LHA Archive", editable: false},
    {suffix: ".arj", format: "arj", label: "ARJ Archive", editable: false},
    {suffix: ".xar", format: "xar", label: "XAR Archive", editable: false},
    {suffix: ".chm", format: "chm", label: "Compiled HTML Help", editable: false},
    {suffix: ".chw", format: "chm", label: "Compiled Help Index", editable: false},
    {suffix: ".lib", format: "ar", label: "Static Library", editable: false},
    {suffix: ".ar", format: "ar", label: "AR Archive", editable: false},
    {suffix: ".a", format: "ar", label: "Static Library", editable: false},
    {suffix: ".rar", format: "rar", label: "RAR", editable: false},
];

export function detectArchiveFormat(
    filePath: string
): ArchiveFormat | undefined {
    return findArchiveSuffix(filePath)?.format;
}

export function archiveFileName(
    filePath: string
): string {
    return path.basename(filePath);
}

export function archiveBaseName(
    filePath: string
): string {
    const fileName = archiveFileName(filePath);
    const candidate = findArchiveSuffix(fileName);

    if (candidate) {
        return fileName.slice(0, fileName.length - candidate.suffix.length);
    }

    return path.parse(fileName).name;
}

export function archiveContainerLabel(
    filePath: string
): string {
    return ( findArchiveSuffix(filePath)?.label || "Archive");
}

export function isEditableArchiveFormat(
    filePath: string
): boolean {
    if (isSatoBackupFileName(filePath)) {
        return false;
    }

    return (findArchiveSuffix(filePath)?.editable === true);
}

export function isArchivePasswordEditable(
    filePath: string
): boolean {
    if (isSatoBackupFileName(filePath)) {
        return false;
    }

    return (findArchiveSuffix(filePath) ?.passwordEditable === true);
}

export function archiveFormatLabel(
    format: ArchiveFormat
): string {
    switch (format) {
        case "zip":
            return "ZIP";

        case "zipx":
            return "ZIPX";

        case "7z":
            return "7-Zip";

        case "rar":
            return "RAR";

        case "dmg":
            return "DMG Disk Image";

        case "deb":
            return "DEB Package";

        case "rpm":
            return "RPM Package";

        case "cab":
            return "CAB Archive";

        case "cpio":
            return "CPIO Archive";

        case "ar":
            return "AR Archive";

        case "zstd":
            return "Zstandard";

        case "tar-zstd":
            return "TAR.ZST";

        case "lzma":
            return "LZMA";

        case "compress":
            return "Unix Compress";

        case "tar-compress":
            return "TAR.Z";

        case "lzh":
            return "LZH Archive";

        case "arj":
            return "ARJ Archive";

        case "xar":
            return "XAR Archive";

        case "chm":
            return "Compiled HTML Help";

        case "alz":
            return "ALZip";

        case "egg":
            return "EGG";

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
    }
}

function normalizeArchiveFilePath(
    filePath: string
): string {
    return normalizeBackupFileName(filePath);
}

function findArchiveSuffix(
    filePath: string
): ArchiveSuffix | undefined {
    const normalized = normalizeArchiveFilePath(filePath);
    return ARCHIVE_SUFFIXES.find(candidate => normalized.endsWith(candidate.suffix));
}
