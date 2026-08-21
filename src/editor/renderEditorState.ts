import * as vscode from "vscode";
import { APP_VERSION, GIT_COMMIT } from "../buildInfo";
import { renderVault, type Settings } from "../webview";

import type { VaultDocument } from "../types";

import {
    buildTree,
    computeStats,
    type GroupView,
    type VaultStats
} from "../vault";


export interface EditorRenderContext {
    extensionUri: vscode.Uri;
    readSettings: () => Settings;
}

export function renderLockedShell(
    context: EditorRenderContext,
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    openUnlockModal: boolean
): void {
    const root: GroupView = {
        id: "locked-root",
        parentId: null,
        name: "Vault",
        groups: [],
        entries: []
    };

    const stats: VaultStats = {
        groups: 0,
        entries: 0,
        duplicates: 0,
        expired: 0,
        emptyGroups: 0,
        weak: 0
    };

    const resources = createResourceUris(
        context.extensionUri
    );

    panel.webview.html = renderVault(
        panel.webview,
        document.uri,
        root,
        stats,
        context.readSettings(),
        resources.logoUri,
        resources.toolbarLogoUri,
        resources.codiconsCssUri,
        resources.webviewClientUri,
        APP_VERSION,
        GIT_COMMIT
    );

    setTimeout(() => {
        panel.webview.postMessage({
            type: "vaultLocked"
        });

        if (openUnlockModal) {
            panel.webview.postMessage({
                type: "openUnlockModal"
            });
        }
    }, 100);
}

export function renderEditorState(
    context: EditorRenderContext,
    document: VaultDocument,
    panel: vscode.WebviewPanel,
    initialLoad: boolean
): void {
    const settings = context.readSettings();

    const resources = createResourceUris(
        context.extensionUri
    );

    if (document.certificate) {
        const certificate = document.certificate;

        if (initialLoad) {
            panel.webview.html = renderVault(
                panel.webview,
                document.uri,
                certificate.tree,
                certificate.stats,
                settings,
                resources.logoUri,
                resources.toolbarLogoUri,
                resources.codiconsCssUri,
                resources.webviewClientUri,
                APP_VERSION,
                GIT_COMMIT,
                certificate.selectedEntryId
            );
        } else {
            panel.webview.postMessage({
                type: "vaultState",
                state: {
                    tree: certificate.tree,
                    stats: certificate.stats,
                    settings,
                    selectedEntryId:
                        certificate.selectedEntryId
                }
            });
        }

        return;
    }

    if (document.importedVault) {
        const importedVault =
            document.importedVault;

        if (initialLoad) {
            panel.webview.html = renderVault(
                panel.webview,
                document.uri,
                importedVault.tree,
                importedVault.stats,
                settings,
                resources.logoUri,
                resources.toolbarLogoUri,
                resources.codiconsCssUri,
                resources.webviewClientUri,
                APP_VERSION,
                GIT_COMMIT,
                null,
                true,
                importedVault.format
            );
        } else {
            panel.webview.postMessage({
                type: "vaultState",
                state: {
                    tree: importedVault.tree,
                    stats: importedVault.stats,
                    settings,
                    selectedEntryId: null,
                    readOnlyVault: true,
                    vaultFormat:
                        importedVault.format
                }
            });
        }

        return;
    }

    if (document.psafe) {
        const psafe = document.psafe;

        if (initialLoad) {
            panel.webview.html = renderVault(
                panel.webview,
                document.uri,
                psafe.tree,
                psafe.stats,
                settings,
                resources.logoUri,
                resources.toolbarLogoUri,
                resources.codiconsCssUri,
                resources.webviewClientUri,
                APP_VERSION,
                GIT_COMMIT
            );
        } else {
            panel.webview.postMessage({
                type: "vaultState",
                state: {
                    tree: psafe.tree,
                    stats: psafe.stats,
                    settings
                }
            });
        }

        return;
    }

    if (!document.db) {
        return;
    }

    const tree = buildTree(document.db);
    const stats = computeStats(document.db);

    if (initialLoad) {
        panel.webview.html = renderVault(
            panel.webview,
            document.uri,
            tree,
            stats,
            settings,
            resources.logoUri,
            resources.toolbarLogoUri,
            resources.codiconsCssUri,
            resources.webviewClientUri,
            APP_VERSION,
            GIT_COMMIT
        );

        return;
    }

    panel.webview.postMessage({
        type: "vaultState",
        state: {
            tree,
            stats,
            settings
        }
    });
}

function createResourceUris(
    extensionUri: vscode.Uri
): {
    logoUri: vscode.Uri;
    toolbarLogoUri: vscode.Uri;
    codiconsCssUri: vscode.Uri;
    webviewClientUri: vscode.Uri;
} {
    return {
        logoUri: vscode.Uri.joinPath(
            extensionUri,
            "assets",
            "sato.png"
        ),

        toolbarLogoUri: vscode.Uri.joinPath(
            extensionUri,
            "assets",
            "sato_icon.jpg"
        ),

        codiconsCssUri: vscode.Uri.joinPath(
            extensionUri,
            "assets",
            "codicons",
            "codicon.css"
        ),

        webviewClientUri: vscode.Uri.joinPath(
            extensionUri,
            "dist",
            "webviewClient.js"
        )
    };
}
