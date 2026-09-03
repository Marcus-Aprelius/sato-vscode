import * as vscode from "vscode";

const RELEASES_URL = "https://github.com/Marcus-Aprelius/sato-vscode/releases";
const LATEST_RELEASE_URL = "https://api.github.com/repos/Marcus-Aprelius/sato-vscode/releases/latest";

export async function checkForUpdates(
    currentVersion: string
): Promise<void> {
    const latest =
        await fetchLatestReleaseVersion();

    if (!latest) {
        const answer =
            await vscode.window.showWarningMessage(
                "SATO: failed to check updates.",
                "Open Releases"
            );

        if (answer === "Open Releases") {
            await openExternalUrl(RELEASES_URL);
        }

        return;
    }

    if (!isNewerVersion(latest, currentVersion)) {
        vscode.window.showInformationMessage("SATO is up to date.");

        return;
    }

    const answer = await vscode.window.showInformationMessage(
            `New version is available: ${latest}.`,
            "Open Update"
        );

    if (answer === "Open Update") {
        await openExternalUrl(RELEASES_URL);
    }
}

export async function openExternalUrl(
    rawUrl: string
): Promise<void> {
    const value = rawUrl.trim();

    if (!value) {
        return;
    }

    const url = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value) ? value : `https://${value}`;

    let uri: vscode.Uri;

    try {
        uri = vscode.Uri.parse(url, true);

    } catch {
        vscode.window.showWarningMessage("SATO: invalid URL");

        return;
    }

    if (!uri.authority) {
        vscode.window.showWarningMessage("SATO: invalid URL");

        return;
    }

    if (uri.scheme !== "http" && uri.scheme !== "https") {
        vscode.window.showWarningMessage("SATO: only http and https URLs are supported");

        return;
    }

    await vscode.env.openExternal(uri);
}

async function fetchLatestReleaseVersion():
    Promise<string | undefined> {
    try {
        const response = await fetch(LATEST_RELEASE_URL, {headers: {"User-Agent": "sato-vscode"}});

        if (!response.ok) {
            return undefined;
        }

        const data = await response.json() as {tag_name?: string; name?: string;};

        return normalizeVersion(data.tag_name || data.name || "");

    } catch {
        return undefined;
    }
}

function normalizeVersion(
    value: string
): string {
    return value.trim().replace(/^v/i, "");
}

function isNewerVersion(
    latest: string,
    current: string
): boolean {
    const latestParts = parseVersion(latest);

    const currentParts = parseVersion(current);

    for (let index = 0; index < 3; index++) {
        if (latestParts[index] > currentParts[index]) {
            return true;
        }

        if (latestParts[index] < currentParts[index]) {
            return false;
        }
    }

    return false;
}

function parseVersion(
    value: string
): [number, number, number] {
    const parts = normalizeVersion(value).split(".").map((part) => Number.parseInt(part, 10));

    return [
        Number.isFinite(parts[0]) ? parts[0] : 0,
        Number.isFinite(parts[1]) ? parts[1] : 0,
        Number.isFinite(parts[2]) ? parts[2] : 0
    ];
}
