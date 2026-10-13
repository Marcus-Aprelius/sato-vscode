import * as fs from "fs";
import * as path from "path";

export interface SplitArchivePathResolution {
    requestedPath: string;
    primaryPath: string;
    split: boolean;
    primary: boolean;
}

export function splitArchivePrimaryPathCandidate(
    filePath: string
): SplitArchivePathResolution {
    const normalizedPath = path.resolve(filePath);
    const fileName = path.basename(normalizedPath);
    const directoryPath = path.dirname(normalizedPath);
    const eggMatch = fileName.match(/^(.*)\.vol(\d+)\.egg$/i);

    if (eggMatch) {
        const primaryFileName = `${eggMatch[1]}.vol1.egg`;
        const primaryPath = path.join(directoryPath, primaryFileName);
        const volumeNumber = Number.parseInt(eggMatch[2], 10);

        return {requestedPath: normalizedPath, primaryPath, split: true, primary: volumeNumber === 1};
    }

    const alzMatch = fileName.match(/^(.*)\.a(\d{2})$/i);

    if (alzMatch) {
        return {requestedPath: normalizedPath, primaryPath: path.join(directoryPath, `${alzMatch[1]}.alz`), split: true, primary: false};
    }

    return {requestedPath: normalizedPath, primaryPath: normalizedPath, split: false, primary: true};
}

export async function resolveSplitArchivePrimaryPath(
    filePath: string
): Promise<SplitArchivePathResolution> {
    const resolution = splitArchivePrimaryPathCandidate(filePath);

    if (resolution.split && !sameFilePath(resolution.requestedPath, resolution.primaryPath)) {
        try {
            const stat = await fs.promises.stat(resolution.primaryPath);

            if (!stat.isFile()) {
                throw new Error();
            }
        } catch {
            throw new Error(`The primary archive volume "${path.basename(resolution.primaryPath)}" was not found.`);
        }
    }

    return resolution;
}

function sameFilePath(
    left: string,
    right: string
): boolean {
    const normalizedLeft = path.resolve(left);
    const normalizedRight = path.resolve(right);

    return process.platform === "win32" ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase() : normalizedLeft === normalizedRight;
}
