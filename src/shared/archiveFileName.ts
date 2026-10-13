import { ARCHIVE_FILE_EXTENSIONS } from "../fileFormats";

const ARCHIVE_SUFFIXES = [...ARCHIVE_FILE_EXTENSIONS].map(extension => `.${extension}`).sort((left, right) => right.length - left.length);

export function archiveExtractionFolderName(
    archiveName: string
): string {
    const withoutBackup = archiveName.toLowerCase().endsWith(".bak") ? archiveName.slice(0, -4) : archiveName;
    const normalizedName = withoutBackup.toLowerCase();
    const suffix = ARCHIVE_SUFFIXES.find(candidate => normalizedName.endsWith(candidate));

    return suffix ? withoutBackup.slice(0, withoutBackup.length - suffix.length) : archiveName;
}
