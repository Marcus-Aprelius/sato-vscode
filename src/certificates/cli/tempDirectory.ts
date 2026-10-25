import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function createTemporaryDirectory(
    prefix: string
): string {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));

    try {
        fs.chmodSync(temporaryDirectory, 0o700);
        return temporaryDirectory;

    } catch (error) {
        try {
            fs.rmSync(temporaryDirectory, {recursive: true, force: true});
        } catch (cleanupError) {
            throw new AggregateError(
                [error, cleanupError],
                "Failed to create a private temporary directory and remove the incomplete directory.",
                {cause: error}
            );
        }

        throw error;
    }
}

export function removeTemporaryDirectory(
    temporaryDirectory: string
): void {
    if (!temporaryDirectory) {
        return;
    }

    try {
        fs.rmSync(temporaryDirectory, {recursive: true, force: true});

    } catch {
        // Ignore temporary file cleanup errors.
    }
}
