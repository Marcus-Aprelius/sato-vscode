import * as vscode from "vscode";

export async function readFileSize(
    uri: vscode.Uri
): Promise<number> {
    try {
        const stat = await vscode.workspace.fs.stat(uri);

        return stat.size;

    } catch {
        return 0;
    }
}
