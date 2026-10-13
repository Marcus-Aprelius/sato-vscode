import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { spawnSync } from "child_process";
import { extractRpmCpioPayload } from "./rpmPayload";
import { inspectSevenZipArchive } from "./sevenZipInspector";

import type { ArchiveEntry, ArchiveInspection, ArchiveSecurityLimits } from "./types";

export async function inspectRpmPackage(
    filePath: string,
    limits?: ArchiveSecurityLimits
): Promise<ArchiveInspection> {
    const packageStat = await fs.promises.stat(filePath);
    const details = readRpmPackageDetails(filePath);
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sato-rpm-inspect-"));

    try {
        const cpioPath = await extractRpmCpioPayload(filePath, temporaryDirectory);
        const payloadInspection = await inspectSevenZipArchive(cpioPath, "rpm", limits);
        const entries = prefixEntries(payloadInspection.entries, "Payload");
        const warnings = [...payloadInspection.warnings];

        if (!details) {
            warnings.push("Extended RPM package metadata is unavailable. Install or verify the rpm CLI, then restart VS Code.");
        }

        return {
            fileName: path.basename(filePath),
            filePath,
            format: "rpm",
            encrypted: false,
            fileSize: packageStat.size,
            entryCount: entries.length,
            totalUncompressedSize: entries.reduce((total, entry) => total + entry.uncompressedSize, 0),
            entries,
            warnings,
            details
        };

    } finally {
        await fs.promises.rm(temporaryDirectory, {recursive: true, force: true});
    }
}

function readRpmPackageDetails(
    filePath: string
): string | undefined {
    const queryFormat = [
        "Package: %{NAME}", "Version: %{VERSION}", "Release: %{RELEASE}", "Architecture: %{ARCH}",
        "Vendor: %{VENDOR}", "License: %{LICENSE}", "Summary: %{SUMMARY}", "Description: %{DESCRIPTION}",
        "Packager: %{PACKAGER}", "Build time: %{BUILDTIME:date}", "Installed size: %{SIZE} bytes"].join("\n") + "\n";

    const result = spawnSync(
        "rpm",
        ["-qp", "--queryformat", queryFormat, filePath],
        {encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024, windowsHide: true}
    );

    if (result.error || result.status !== 0) {
        return undefined;
    }

    const packageInfo = String(result.stdout || "").trim();

    if (!packageInfo) {
        return undefined;
    }

    const requiresResult = spawnSync(
        "rpm",
        ["-qp", "--requires", filePath],
        {encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024, windowsHide: true}
    );

    const providesResult = spawnSync(
        "rpm",
        ["-qp", "--provides", filePath],
        {encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024, windowsHide: true}
    );

    const signatureResult = spawnSync(
        "rpm",
        ["-K", filePath],
        {encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024, windowsHide: true}
    );

    const signatureStatus = [
        String(signatureResult.stdout || "").trim(),
        String(signatureResult.stderr || "").trim()
        ].filter(Boolean).join("\n").replace(`${filePath}:`, "").trim();

    const sections = [packageInfo];

    if (signatureStatus) {
        sections.push(`Signature status: ${signatureStatus}`);
    }

    if (!requiresResult.error && requiresResult.status === 0) {
        const requires = String(requiresResult.stdout || "").trim();

        if (requires) {
            sections.push(`Requires:\n${requires}`);
        }
    }

    if (!providesResult.error && providesResult.status === 0) {
        const provides = String(providesResult.stdout || "").trim();

        if (provides) {
            sections.push(`Provides:\n${provides}`);
        }
    }

    return sections.join("\n\n");
}

function prefixEntries(
    entries: readonly ArchiveEntry[],
    prefix: string
): ArchiveEntry[] {
    return entries.map(entry => ({...entry, path: `${prefix}/${normalizeEntryPath(entry.path)}` }));
}

function normalizeEntryPath(
    entryPath: string
): string {
    return entryPath.replace(/\\/g, "/").replace(/^\.?\/*/, "").replace(/\/+$/, "");
}
