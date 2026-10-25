import { extractEncryptedZipArchive } from "./encryptedZipExtractor";
import { extractSevenZipArchive } from "./sevenZipExtractor";
import { extractZipArchive } from "./zipExtractor";
import { extractAlzEggArchive } from "./uneggExtractor";
import { extractDebPackage } from "./debExtractor";
import { extractRpmPackage } from "./rpmExtractor";

import type { ArchiveInspection, ArchiveSecurityLimits } from "./types";
import type { ZipExtractionResult} from "./zipExtractor";

export async function extractArchive(
    archivePath: string,
    inspection: ArchiveInspection,
    destinationDirectory: string,
    password?: string,
    selectedPaths?: ReadonlySet<string>,
    limits?: ArchiveSecurityLimits
): Promise<ZipExtractionResult> {
    if (inspection.format === "zip") {
        if (inspection.encrypted) {
            return extractEncryptedZipArchive(archivePath, destinationDirectory, password || "", selectedPaths);
        }

        return extractZipArchive(archivePath, destinationDirectory, selectedPaths, limits);
    }

    if (inspection.format === "alz" || inspection.format === "egg") {
        return extractAlzEggArchive(archivePath, inspection, destinationDirectory, password, selectedPaths);
    }

    if (inspection.format === "deb") {
        return extractDebPackage(archivePath, inspection, destinationDirectory, selectedPaths);
    }

    if (inspection.format === "rpm") {
        return extractRpmPackage( archivePath, inspection, destinationDirectory, selectedPaths);
    }

    return extractSevenZipArchive(archivePath, inspection, destinationDirectory, password, selectedPaths);
}
