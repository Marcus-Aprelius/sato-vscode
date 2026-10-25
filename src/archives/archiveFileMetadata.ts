import * as fs from "fs";

export async function preserveFileMetadata(
    filePath: string,
    originalStat: fs.Stats
): Promise<void> {
    if (process.platform !== "win32") {
        await fs.promises.chown(filePath, originalStat.uid, originalStat.gid);
    }

    await fs.promises.chmod(filePath, originalStat.mode & 0o7777);
    await fs.promises.utimes(filePath, originalStat.atime, originalStat.mtime);
}
