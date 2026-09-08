import * as vscode from "vscode";
import * as kdbxweb from "kdbxweb";
import { argon2d, argon2id } from "hash-wasm";
import { SUPPORTED_VAULT_FILTERS } from "./constants";
import { KdbxEditorProvider } from "./KdbxEditorProvider";

// hash-wasm implements Argon2 v1.3 only; KDBX 4 files created by KeePass 2.35+ use v1.3.
kdbxweb.CryptoEngine.setArgon2Impl(async (password, salt, memory, iterations, length, parallelism, type) => {
    const fn = type === kdbxweb.CryptoEngine.Argon2TypeArgon2d ? argon2d : argon2id;
    const result = await fn({
        password: new Uint8Array(password),
        salt: new Uint8Array(salt),
        parallelism,
        iterations,
        memorySize: memory,
        hashLength: length,
        outputType: "binary"
    });
    return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength) as ArrayBuffer;
});

export function activate(context: vscode.ExtensionContext): void {
    const provider = new KdbxEditorProvider(context);

    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            KdbxEditorProvider.viewType,
            provider,
            {webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: false}
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("sato.openKdbx", async (uri?: vscode.Uri) => {
            const target = uri ?? (await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: SUPPORTED_VAULT_FILTERS
            }))?.[0];

            if (!target) {
                return;
            }

            await vscode.commands.executeCommand("vscode.openWith", target, KdbxEditorProvider.viewType);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("sato.lockVault", () => {
            const editor = provider.getActiveEditor();
            if (!editor) {
                vscode.window.showInformationMessage("SATO: no open vault to lock");
                return;
            }
            editor.lock();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("sato.reloadVault", async () => {
            const editor = provider.getActiveEditor();
            if (!editor) {
                vscode.window.showInformationMessage("SATO: no open vault to reload");
                return;
            }
            await editor.reload();
        })
    );
}

export function deactivate(): void {}

