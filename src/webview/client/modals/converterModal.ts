import { maybeById } from "../dom";
import { vscode } from "../globals";
import { closeModal, openModal } from "./modalLifecycle";

type CryptoOutputFormat = | "PEM" | "DER" | "RFC4716" | "PKCS8";

interface AvailableOutputFormat {
    value: CryptoOutputFormat;
    label: string;
    extension: string;
}

interface CryptoConversionData {
    entryId: string;
    fileName: string;
    filePath: string;
    type: string;
    sourceFormat: string;
    outputFormat: CryptoOutputFormat;
    availableOutputFormats: AvailableOutputFormat[];
    outputFileName: string;
    subject: string;
    issuer: string;
    validTo: string;
    sha256: string;
}

let conversionData: CryptoConversionData | undefined;

export function openCryptoConverter(
    data: CryptoConversionData
): void {
    conversionData = data;

    setText("converter-source-file", data.fileName);
    setText("converter-source-type", data.type);
    setText("converter-source-format", data.sourceFormat);
    setText("converter-source-subject", data.subject);
    setText("converter-source-issuer", data.issuer);
    setText("converter-source-valid-to", data.validTo);
    setText("converter-source-sha256", data.sha256);

    const outputFormat = maybeById<HTMLSelectElement>("converter-output-format");

    if (outputFormat) {
        outputFormat.innerHTML = "";

        for (const format of data.availableOutputFormats) {
            const option = document.createElement("option");

            option.value = format.value;
            option.textContent = format.label;
            option.dataset.extension = format.extension;
            outputFormat.appendChild(option);
        }

        outputFormat.value = data.outputFormat;
    }

    const outputFilePath = maybeById<HTMLInputElement>( "converter-output-file-path");

    if (outputFilePath) {
        outputFilePath.value = sourceDirectory(data.filePath);
    }

    const outputFileName = maybeById<HTMLInputElement>("converter-output-file-name");

    if (outputFileName) {
        outputFileName.value = data.outputFileName;
    }

    if (outputFormat) {
        outputFormat.disabled = false;
    }

    if (outputFilePath) {
        outputFilePath.disabled = false;
    }

    if (outputFileName) {
        outputFileName.disabled = false;
    }

    const convertButton = maybeById<HTMLButtonElement>("converter-convert");

    if (convertButton) {
        convertButton.disabled = false;
    }

    const outputPathBrowseButton = maybeById<HTMLButtonElement>("converter-output-file-path-browse");
    const outputFileNameCopyButton = maybeById<HTMLButtonElement>("converter-output-file-name-copy");

    if (outputPathBrowseButton) {
        outputPathBrowseButton.disabled = false;
    }

    if (outputFileNameCopyButton) {
        outputFileNameCopyButton.disabled = false;
    }

    const outputSection = maybeById<HTMLElement>("converter-output-section");

    if (outputSection) {
        outputSection.style.visibility = "visible";
    }

    const sourceDetails = maybeById<HTMLElement>("converter-source-details");

    if (sourceDetails) {
        sourceDetails.style.display = "";
    }

    openModal("converter-modal");

    setTimeout(() => {outputFileName?.focus(); outputFileName?.select();}, 0);
}

export function bindConverterModalActions(): void {
    maybeById("converter-cancel")?.addEventListener("click", closeCryptoConverter);
    maybeById("converter-convert")?.addEventListener("click", submitCryptoConversion);
    maybeById("converter-output-format")?.addEventListener("change", updateOutputFileExtension);
    maybeById("converter-source-browse")?.addEventListener("click", () => {
        vscode.postMessage({type: "selectCryptoConversionSource"});});

    maybeById("converter-output-file-path-browse")?.addEventListener("click", () => {
            if (!conversionData) {
                return;
            }

            const outputFilePath = maybeById<HTMLInputElement>("converter-output-file-path");

            vscode.postMessage({
                type: "selectCryptoConversionDirectory",
                initialPath: outputFilePath?.value.trim() || sourceDirectory(conversionData.filePath)
            });
        }
    );

    maybeById("converter-output-file-name-copy")?.addEventListener("click", () => {
            const fileName =maybeById<HTMLInputElement>("converter-output-file-name")?.value.trim();

            if (!fileName) {
                return;
            }

            vscode.postMessage({type: "copyText", text: fileName});
        }
    );
}

export function openEmptyCryptoConverter(): void {
    conversionData = undefined;

    const sourceDetails = maybeById<HTMLElement>("converter-source-details");

    if (sourceDetails) {
        sourceDetails.style.display = "none";
    }

    const outputSection = maybeById<HTMLElement>("converter-output-section");

    if (outputSection) {
        outputSection.style.visibility = "hidden";
    }

    setText("converter-source-file", "No file selected");
    setText("converter-source-type", "");
    setText("converter-source-format", "");
    setText("converter-source-subject", "");
    setText("converter-source-issuer", "");
    setText("converter-source-valid-to", "");
    setText("converter-source-sha256", "");

    const outputFormat = maybeById<HTMLSelectElement>("converter-output-format");
    const outputFilePath = maybeById<HTMLInputElement>("converter-output-file-path");
    const outputFileName = maybeById<HTMLInputElement>("converter-output-file-name");
    const convertButton =maybeById<HTMLButtonElement>("converter-convert");
    const outputPathBrowseButton = maybeById<HTMLButtonElement>("converter-output-file-path-browse");
    const outputFileNameCopyButton = maybeById<HTMLButtonElement>("converter-output-file-name-copy");

    if (outputPathBrowseButton) {
        outputPathBrowseButton.disabled = true;
    }

    if (outputFileNameCopyButton) {
        outputFileNameCopyButton.disabled = true;
    }

    if (outputFormat) {
        outputFormat.innerHTML = "";
        outputFormat.disabled = true;
    }

    if (outputFilePath) {
        outputFilePath.value = "";
        outputFilePath.disabled = true;
    }

    if (outputFileName) {
        outputFileName.value = "";
        outputFileName.disabled = true;
    }

    if (convertButton) {
        convertButton.disabled = true;
    }

    openModal("converter-modal");
}

function submitCryptoConversion(): void {
    if (!conversionData) {
        return;
    }

    const outputFormat = maybeById<HTMLSelectElement>("converter-output-format");
    const outputFilePath = maybeById<HTMLInputElement>("converter-output-file-path");
    const outputFileName = maybeById<HTMLInputElement>("converter-output-file-name");

    if (!outputFormat || !outputFilePath || !outputFileName) {
        return;
    }

    const filePath = outputFilePath.value.trim();

    if (!filePath) {
        outputFilePath.focus();
        return;
    }

    const fileName = outputFileName.value.trim();

    if (!fileName) {
        outputFileName.focus();
        return;
    }

    vscode.postMessage({
        type: "convertCryptoFile",
        entryId: conversionData.entryId,
        outputFormat: outputFormat.value as CryptoOutputFormat,
        outputFilePath: filePath,
        outputFileName: fileName
    });

    closeCryptoConverter();
}

function updateOutputFileExtension(): void {
    if (!conversionData) {
        return;
    }

    const outputFormat = maybeById<HTMLSelectElement>("converter-output-format");
    const outputFileName = maybeById<HTMLInputElement>("converter-output-file-name");

    if (!outputFormat || !outputFileName) {
        return;
    }

    const selectedFormat = conversionData.availableOutputFormats.find((format) => format.value === outputFormat.value);

    if (!selectedFormat) {
        return;
    }

    const currentName = outputFileName.value.trim();
    const baseName = removeKnownOutputSuffix(currentName);

    outputFileName.value = `${baseName || "converted"}${selectedFormat.extension}`;
}

function removeKnownOutputSuffix(
    fileName: string
): string {
    return fileName.replace(/-rfc4716\.pub$/i, "").replace(/-pkcs8\.pem$/i, "").replace(/\.(?:pem|der|pub)$/i, "");
}

function closeCryptoConverter(): void {
    conversionData = undefined;

    const outputFilePath = maybeById<HTMLInputElement>("converter-output-file-path");
    const outputFileName = maybeById<HTMLInputElement>("converter-output-file-name");

    if (outputFilePath) {
        outputFilePath.value = "";
    }

    if (outputFileName) {
        outputFileName.value = "";
    }

    closeModal();
}

function setText(
    elementId: string,
    value: string
): void {
    const element = maybeById<HTMLElement>(elementId);

    if (!element) {return;}

    element.textContent = value || "(empty)";
}

function sourceDirectory(
    filePath: string
): string {
    const normalized = filePath.replace(/\\/g, "/");
    const separatorIndex = normalized.lastIndexOf("/");

    if (separatorIndex < 0) {return "";}

    const directory = normalized.slice(0, separatorIndex);

    if (filePath.includes("\\")) {
        return directory.replace(/\//g, "\\");
    }

    return directory;
}
