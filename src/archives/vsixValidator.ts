import * as fs from "fs";
import * as path from "path";
import * as yauzl from "yauzl";

export interface VsixValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    extensionName?: string;
    displayName?: string;
    publisher?: string;
    version?: string;
    vscodeEngine?: string;
    main?: string;
    fileCount: number;
}

interface VsixPackageJson {
    name?: string;
    displayName?: string;
    publisher?: string;
    version?: string;
    engines?: {vscode?: string;};
    main?: string;
    browser?: string;
    icon?: string;
    readme?: string;
}

interface VsixContents {
    paths: Set<string>;
    packageJsonText?: string;
    manifestText?: string;
}

const REQUIRED_FILES = [
    "[Content_Types].xml",
    "extension.vsixmanifest",
    "extension/package.json"
] as const;

export async function validateVsixPackage(
    filePath: string
): Promise<VsixValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const stat = await fs.promises.stat(filePath);

    if (!stat.isFile()) {
        return {
            valid: false,
            errors: ["The selected path is not a regular file."],
            warnings,
            fileCount: 0
        };
    }

    if (!filePath.toLowerCase().endsWith(".vsix")) {
        return {
            valid: false,
            errors: ["The selected file does not have the .vsix extension."],
            warnings,
            fileCount: 0
        };
    }

    const contents = await readVsixContents(filePath);

    for (const requiredFile of REQUIRED_FILES) {
        if (!contents.paths.has(requiredFile.toLowerCase())) {
            errors.push(`Required package file is missing: ${requiredFile}`);
        }
    }

    for (const archivePath of contents.paths) {
        const pathError = validatePackagePath(archivePath);

        if (pathError) {
            errors.push(`Unsafe package path "${archivePath}": ${pathError}`);
        }
    }

    let packageJson: VsixPackageJson | undefined;

    if (contents.packageJsonText !== undefined) {
        try {
            packageJson = JSON.parse(contents.packageJsonText) as VsixPackageJson;

        } catch (error) {
            errors.push("extension/package.json is not valid JSON: " + describeError(error));
        }
    }

    if (packageJson) {
        validatePackageJson(packageJson, contents.paths, errors, warnings);
    }

    const manifestVersion = contents.manifestText ? readManifestAttribute(contents.manifestText, "Identity", "Version") : undefined;
    const manifestPublisher = contents.manifestText ? readManifestAttribute(contents.manifestText, "Identity", "Publisher") : undefined;
    const manifestId = contents.manifestText ? readManifestAttribute(contents.manifestText, "Identity", "Id") : undefined;

    if (packageJson?.version && manifestVersion && packageJson.version !== manifestVersion) {
        errors.push("Version mismatch: " +
            `extension/package.json contains ${packageJson.version}, ` + `but extension.vsixmanifest contains ${manifestVersion}.`
        );
    }

    if (packageJson?.publisher && manifestPublisher && packageJson.publisher !== manifestPublisher) {
        errors.push( "Publisher mismatch: " +
            `extension/package.json contains "${packageJson.publisher}", ` + `but extension.vsixmanifest contains "${manifestPublisher}".`
        );
    }

    if (packageJson?.name && manifestId && packageJson.name !== manifestId) {
        warnings.push("Extension name differs between package.json and " +
            `extension.vsixmanifest: "${packageJson.name}" and "${manifestId}".`
        );
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        extensionName: packageJson?.name,
        displayName: packageJson?.displayName,
        publisher: packageJson?.publisher,
        version: packageJson?.version,
        vscodeEngine: packageJson?.engines?.vscode,
        main: packageJson?.main,
        fileCount: contents.paths.size
    };
}

function validatePackageJson(
    packageJson: VsixPackageJson,
    packagePaths: ReadonlySet<string>,
    errors: string[],
    warnings: string[]
): void {
    if (!packageJson.name?.trim()) {
        errors.push("extension/package.json does not define name.");
    }

    if (!packageJson.publisher?.trim()) {
        errors.push("extension/package.json does not define publisher.");
    }

    if (!packageJson.version?.trim()) {
        errors.push("extension/package.json does not define version.");
    }

    if (!packageJson.engines?.vscode?.trim()) {
        errors.push("extension/package.json does not define engines.vscode.");
    }

    validateReferencedFile(packageJson.main, "main entry point", packagePaths, errors);
    validateReferencedFile(packageJson.browser, "browser entry point", packagePaths, errors);
    validateReferencedFile(packageJson.icon, "extension icon", packagePaths, warnings);

    if (!packagePaths.has("extension/readme.md") && !packagePaths.has("extension/readme.txt")) {
        warnings.push("The VSIX package does not contain a README file.");
    }

    if (!packagePaths.has("extension/license") && !packagePaths.has("extension/license.md") && !packagePaths.has("extension/license.txt")) {
        warnings.push("The VSIX package does not contain a LICENSE file.");
    }
}

function validateReferencedFile(
    configuredPath: string | undefined,
    label: string,
    packagePaths: ReadonlySet<string>,
    messages: string[]
): void {
    if (!configuredPath) {
        return;
    }

    const normalizedPath = normalizeExtensionPath(configuredPath);

    if (!packagePaths.has(normalizedPath)) {
        messages.push(`The declared ${label} is missing: ${normalizedPath}`);
    }
}

function normalizeExtensionPath(
    configuredPath: string
): string {
    return "extension/" + configuredPath.replace(/\\/g, "/").replace(/^\.?\/*/, "").toLowerCase();
}

function validatePackagePath(
    archivePath: string
): string | undefined {
    const normalizedPath = archivePath.replace(/\\/g, "/");

    if (normalizedPath.startsWith("/") || /^[a-z]:\//i.test(normalizedPath) || normalizedPath.startsWith("//")) {
        return "absolute paths are not allowed";
    }

    const segments = normalizedPath.split("/");

    if (segments.includes("..")) {
        return "parent-directory traversal is not allowed";
    }

    return undefined;
}

function readManifestAttribute(
    xml: string,
    elementName: string,
    attributeName: string
): string | undefined {
    const elementMatch = xml.match(new RegExp(`<${elementName}\\b[^>]*>`, "i"));

    if (!elementMatch) {
        return undefined;
    }

    const attributeMatch = elementMatch[0].match(new RegExp(`\\b${attributeName}="([^"]*)"`, "i"));
    return attributeMatch?.[1];
}

function readVsixContents(
    filePath: string
): Promise<VsixContents> {
    return new Promise((resolve, reject) => {
        yauzl.open(
            filePath,
            { lazyEntries: true, autoClose: true, decodeStrings: true, validateEntrySizes: true, strictFileNames: false },
            (openError, zipFile) => {
                if (openError) {
                    reject(openError);
                    return;
                }

                if (!zipFile) {
                    reject(new Error("Failed to open the VSIX package."));
                    return;
                }

                const paths = new Set<string>();
                let packageJsonText: string | undefined;
                let manifestText: string | undefined;
                let settled = false;

                const finish = (error?: Error): void => {
                    if (settled) {
                        return;
                    }

                    settled = true;

                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve({paths, packageJsonText, manifestText});
                };

                zipFile.on("error", finish);

                zipFile.on("entry", entry => {
                    const normalizedPath = entry.fileName.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
                    paths.add(normalizedPath);

                    if (normalizedPath !== "extension/package.json" && normalizedPath !== "extension.vsixmanifest") {
                        zipFile.readEntry();
                        return;
                    }

                    zipFile.openReadStream(entry, (streamError, stream) => {
                        if (streamError || !stream) {
                            finish(streamError ?? new Error(`Failed to read ${entry.fileName}.`));
                            return;
                        }

                        const chunks: Buffer[] = [];
                        stream.on("data", chunk => {chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));});
                        stream.once("error", finish);

                        stream.once("end", () => {
                            const text = Buffer.concat(chunks).toString("utf8");

                            if (normalizedPath === "extension/package.json") {
                                packageJsonText = text;
                            } else {
                                manifestText = text;
                            }

                            zipFile.readEntry();
                        });
                    }
                    );
                });

                zipFile.once("end", () => {finish();});
                zipFile.readEntry();
            }
        );
    });
}

function describeError(
    error: unknown
): string {
    return error instanceof Error ? error.message : String(error);
}
