import { maybeById } from "../dom";
import { vscode } from "../globals";
import { closeModal, openModal } from "./modalLifecycle";

type CryptoOutputFormat = | "PEM" | "DER" | "RFC4716" | "PKCS8"
    | "RSA_PKCS1_PEM" | "RSA_PKCS1_DER" | "RSA_PKCS8_PEM" | "RSA_PKCS8_DER"
    | "RSA_SPKI_PEM" | "RSA_SPKI_DER" | "RSA_PUBLIC_PKCS1_PEM" | "RSA_PUBLIC_PKCS1_DER"
    | "EC_SEC1_PEM" | "EC_SEC1_DER" | "EC_PKCS8_PEM" | "EC_PKCS8_DER" | "EC_SPKI_PEM" | "EC_SPKI_DER"
    | "SPC_CMS_PEM" | "SPC_CERTIFICATES_PEM" | "SPC_CERTIFICATES_DER" | "SPC_CERTIFICATE_CHAIN_P7B";


interface AvailableOutputFormat {
    value: CryptoOutputFormat;
    label: string;
    extension: string;
    outputFileName: string;
    operation?: "convert" | "extract";
}

interface CryptoConversionData {
    entryId: string;
    initialTab?: ConverterTab;
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
type ConverterTab = | "convert" | "extract";
let activeConverterTab: ConverterTab = "convert";

export function openCryptoConverter(
    data: CryptoConversionData
): void {
    conversionData = data;

    setText("converter-source-file", data.fileName);
    setText("converter-source-type", data.type);
    setText("converter-source-format", data.sourceFormat);
    setOptionalText("converter-source-subject", data.subject);
    setOptionalText("converter-source-issuer", data.issuer);
    setOptionalText("converter-source-valid-to", data.validTo);
    setText("converter-source-sha256", data.sha256);

    const convertFormats = formatsForTab(data, "convert");
    const extractFormats = formatsForTab(data, "extract");
    const requestedTab = data.initialTab || "convert";
    const requestedFormats = requestedTab === "extract" ? extractFormats : convertFormats;

    activeConverterTab = requestedFormats.length > 0 ? requestedTab : convertFormats.length > 0 ? "convert" : "extract";
    const activeFormats = activeConverterTab === "convert" ? convertFormats : extractFormats;
    populateOutputFormats(activeFormats);

    const outputFormat = maybeById<HTMLSelectElement>("converter-output-format");
    const outputFilePath = maybeById<HTMLInputElement>("converter-output-file-path");
    const outputFileName = maybeById<HTMLInputElement>("converter-output-file-name");

    if (outputFilePath) {
        outputFilePath.value = sourceDirectory(data.filePath);
        outputFilePath.disabled = false;
    }

    if (outputFormat) {
        outputFormat.disabled = activeFormats.length === 0;
    }

    if (outputFileName) {
        outputFileName.disabled = activeFormats.length === 0;
    }

    const outputPathBrowseButton = maybeById<HTMLButtonElement>("converter-output-file-path-browse");
    const outputFileNameCopyButton = maybeById<HTMLButtonElement>("converter-output-file-name-copy");

    if (outputPathBrowseButton) {
        outputPathBrowseButton.disabled = false;
    }

    if (outputFileNameCopyButton) {
        outputFileNameCopyButton.disabled = activeFormats.length === 0;
    }

    const outputSection = maybeById<HTMLElement>("converter-output-section");

    if (outputSection) {
        outputSection.style.visibility = "visible";
    }

    const sourceDetails = maybeById<HTMLElement>("converter-source-details");

    if (sourceDetails) {
        sourceDetails.style.display = "";
    }

    updateConverterTabs();
    openModal("converter-modal");

    setTimeout(() => {outputFileName?.focus(); outputFileName?.select();}, 0);
}

export function bindConverterModalActions(): void {
    maybeById("converter-cancel")?.addEventListener("click", closeCryptoConverter);
    maybeById("converter-convert")?.addEventListener("click", submitCryptoConversion);
    maybeById("converter-output-format")?.addEventListener("change", updateOutputFileExtension);
    maybeById("converter-source-browse")?.addEventListener("click", () => {vscode.postMessage({type: "selectCryptoConversionSource"});});
    maybeById("converter-tab-convert")?.addEventListener("click", () => {setConverterTab("convert");});
    maybeById("converter-tab-extract")?.addEventListener("click", () => {setConverterTab("extract");});

    maybeById("converter-output-file-path-browse")?.addEventListener("click", () => {
        if (!conversionData) {
            return;
        }

        const outputFilePath = maybeById<HTMLInputElement>("converter-output-file-path");

        vscode.postMessage({type: "selectCryptoConversionDirectory",
            initialPath: outputFilePath?.value.trim() || sourceDirectory(conversionData.filePath)
        });
    });

    maybeById("converter-output-file-name-copy")?.addEventListener("click", () => {
        const fileName =maybeById<HTMLInputElement>("converter-output-file-name")?.value.trim();

        if (!fileName) {
            return;
        }

        vscode.postMessage({type: "copyText", text: fileName});
    });

    document.querySelectorAll(".converter-copy-source").forEach((button) => {
        button.addEventListener("click", () => {
            const sourceId = (button as HTMLElement).dataset.copySource;

            if (!sourceId) {
                return;
            }

            const element = maybeById<HTMLElement>(sourceId);

            if (!element) {
                return;
            }

            vscode.postMessage({type: "copyText", text: element.textContent || ""});
        });
    });
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
    activeConverterTab = "convert";
    updateConverterTabs();

    const outputFormat = maybeById<HTMLSelectElement>("converter-output-format");
    const outputFilePath = maybeById<HTMLInputElement>("converter-output-file-path");
    const outputFileName = maybeById<HTMLInputElement>("converter-output-file-name");
    const convertButton = maybeById<HTMLButtonElement>("converter-convert");
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

    outputFileName.value = selectedFormat.outputFileName;
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

    if (!element) {
        return;
    }

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

function setOptionalText(
    elementId: string,
    value: string
): void {
    const element = maybeById<HTMLElement>(elementId);

    if (!element) {
        return;
    }

    const row = element.closest(".converter-field") as HTMLElement | null;
    const normalizedValue = value.trim();
    element.textContent = normalizedValue;

    if (row) {
        row.style.display = normalizedValue ? "" : "none";
    }
}

function setConverterTab(
    tab: ConverterTab
): void {
    if (!conversionData) {
        activeConverterTab = tab;
        updateConverterTabs();

        return;
    }

    const availableFormats = formatsForTab(conversionData, tab);

    if (availableFormats.length === 0) {
        return;
    }

    activeConverterTab = tab;

    updateConverterTabs();
    populateOutputFormats(availableFormats);
}

function formatsForTab(
    data: CryptoConversionData,
    tab: ConverterTab
): AvailableOutputFormat[] {
    return data.availableOutputFormats.filter((format) => (format.operation || "convert") === tab);
}

function populateOutputFormats(
    formats: AvailableOutputFormat[]
): void {
    const outputFormat = maybeById<HTMLSelectElement>("converter-output-format");
    const outputFileName = maybeById<HTMLInputElement>("converter-output-file-name");

    if (!outputFormat) {
        return;
    }

    outputFormat.innerHTML = "";

    for (const format of formats) {
        const option = document.createElement("option");

        option.value = format.value;
        option.textContent = format.label;
        option.dataset.extension = format.extension;
        outputFormat.appendChild(option);
    }

    const firstFormat = formats[0];

    if (!firstFormat) {
        if (outputFileName) {
            outputFileName.value = "";
        }

        return;
    }

    if (outputFileName) {
        outputFileName.value = firstFormat.outputFileName;
    }
}

function updateConverterTabs(): void {
    const convertTab = maybeById<HTMLButtonElement>("converter-tab-convert");
    const extractTab = maybeById<HTMLButtonElement>("converter-tab-extract");
    const convertButton = maybeById<HTMLButtonElement>("converter-convert");
    const convertFormats = conversionData ? formatsForTab(conversionData, "convert") : [];
    const extractFormats = conversionData ? formatsForTab(conversionData, "extract") : [];
    const outputTitle = maybeById<HTMLElement>("converter-output-title");

    if (convertTab) {
        convertTab.disabled = convertFormats.length === 0;
        convertTab.classList.toggle("active", activeConverterTab === "convert");
    }

    if (extractTab) {
        extractTab.disabled = extractFormats.length === 0;
        extractTab.classList.toggle("active", activeConverterTab === "extract");
    }

    if (convertButton) {
        convertButton.textContent = activeConverterTab === "extract" ? "Extract" : "Convert";
        convertButton.disabled = activeConverterTab === "extract" ? extractFormats.length === 0 : convertFormats.length === 0;
    }

    if (outputTitle) {
        outputTitle.title = activeConverterTab === "extract" ? "Click [Extract] to create the output file" : "Click [Convert] to create the output file";
    }
}
