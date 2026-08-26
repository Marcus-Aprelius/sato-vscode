import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function createTemporaryDirectory(
    prefix: string
): string {
    return fs.mkdtempSync(
        path.join(
            os.tmpdir(),
            prefix
        )
    );
}

export function removeTemporaryDirectory(
    temporaryDirectory: string
): void {
    if (!temporaryDirectory) {
        return;
    }

    try {
        fs.rmSync(
            temporaryDirectory,
            {
                recursive: true,
                force: true
            }
        );
    } catch {
        // Ignore temporary file cleanup errors.
    }
}
