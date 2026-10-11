import * as fs from "fs";
import * as path from "path";

export interface ExtractionMetadata {
    uid?: number;
    gid?: number;
    directoryMode: number;
    fileMode: number;
}

export async function readExtractionMetadata(
    destinationPath: string
): Promise<ExtractionMetadata> {
    const existingParent = await findExistingParent(destinationPath);
    const stat = await fs.promises.stat(existingParent);

    return {
        uid: process.platform === "win32" ? undefined : stat.uid,
        gid: process.platform === "win32" ? undefined : stat.gid,
        directoryMode: stat.mode & 0o777,
        fileMode: stat.mode & 0o111 ? 0o755 : 0o644
    };
}

export async function applyExtractionMetadata(
    targetPath: string,
    metadata: ExtractionMetadata,
    directory: boolean
): Promise<void> {
    await fs.promises.chmod(targetPath, directory ? metadata.directoryMode : metadata.fileMode);

    if (process.platform !== "win32" && metadata.uid !== undefined && metadata.gid !== undefined) {
        await fs.promises.chown(targetPath, metadata.uid, metadata.gid);
    }
}

async function findExistingParent(
    targetPath: string
): Promise<string> {
    let current = path.resolve(targetPath);

    while (true) {
        try {
            await fs.promises.access(current);
            return current;

        } catch {
            const parent = path.dirname(current);

            if (parent === current) {
                throw new Error(`No existing parent directory found for: ${targetPath}`);
            }

            current = parent;
        }
    }
}
