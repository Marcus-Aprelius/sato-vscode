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
type ConverterTab = "convert" | "extract" | "base64";
let activeConverterTab: ConverterTab = "convert";
let base64LiveMode = true;

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
    maybeById("converter-close")?.addEventListener("click", (event) => {event.preventDefault(); event.stopPropagation(); closeCryptoConverter();});
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

    maybeById("converter-tab-base64")?.addEventListener("click", () => {setConverterTab("base64");});

    maybeById("base64-live-mode")?.addEventListener("click", () => {
        base64LiveMode = !base64LiveMode;

        updateBase64LiveModeButton();
        updateBase64ActionButton();

        if (base64LiveMode) {
            processBase64Text();
        }
    });

    maybeById("base64-operation")?.addEventListener("change", () => {
        clearBase64Error();
        updateBase64ActionButton();

        if (base64LiveMode) {
            processBase64Text();
        }
    });

    maybeById("base64-format")?.addEventListener("change", () => {
        clearBase64Error();

        if (base64LiveMode) {
            processBase64Text();
        }
    });
    maybeById("base64-input")?.addEventListener("input", () => {updateBase64CharacterCounts(); clearBase64Error(); updateBase64ActionButton();

        if (base64LiveMode) {
            processBase64Text();
        }
    });

    maybeById("base64-paste")?.addEventListener("click", async () => {
        try {
            const input = maybeById<HTMLTextAreaElement>("base64-input");

            if (!input) {
                return;
            }

            input.value = await navigator.clipboard.readText();

            updateBase64CharacterCounts();
            clearBase64Error();
            updateBase64ActionButton();
            if (base64LiveMode) {
                processBase64Text();
            }
            input.focus();

        } catch {
            showBase64Error("Failed to read text from the clipboard.");
        }
    });

    maybeById("base64-copy")?.addEventListener("click", () => {
        const output = maybeById<HTMLTextAreaElement>("base64-output")?.value || "";

        if (!output) {
            return;
        }

        vscode.postMessage({type: "copyText", text: output});
    });

    maybeById("base64-clear")?.addEventListener("click", () => {clearBase64Fields(); maybeById<HTMLTextAreaElement>("base64-input")?.focus();});
    maybeById("base64-swap")?.addEventListener("click", () => {swapBase64Fields();});
}

export function openBase64Converter(): void {
    openEmptyCryptoConverter();
    setConverterTab("base64");
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
    if (activeConverterTab === "base64") {
        processBase64Text();

        return;
    }

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
    if (tab === "base64") {
        activeConverterTab = "base64";
        clearBase64Fields();

        const operation = maybeById<HTMLSelectElement>("base64-operation");
        const format = maybeById<HTMLSelectElement>("base64-format");

        if (operation) {
            operation.value = "encode";
        }

        if (format) {
            format.value = "base64url";
        }

        updateBase64LiveModeButton();
        updateConverterTabs();

        const input = maybeById<HTMLTextAreaElement>("base64-input");
        setTimeout(() => {input?.focus();}, 0);

        return;
    }

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
    const base64Tab = maybeById<HTMLButtonElement>("converter-tab-base64");
    const actionButton = maybeById<HTMLButtonElement>("converter-convert");
    const fileContent = maybeById<HTMLElement>("converter-file-content");
    const base64Content = maybeById<HTMLElement>("converter-base64-content");
    const outputTitle = maybeById<HTMLElement>("converter-output-title");
    const convertFormats = conversionData ? formatsForTab(conversionData, "convert") : [];
    const extractFormats = conversionData ? formatsForTab(conversionData, "extract") : [];
    const base64Mode = activeConverterTab === "base64";

    if (convertTab) {
        convertTab.disabled = !!conversionData && convertFormats.length === 0;
        convertTab.classList.toggle("active", activeConverterTab === "convert");
    }

    if (extractTab) {
        extractTab.disabled = !!conversionData && extractFormats.length === 0;
        extractTab.classList.toggle("active", activeConverterTab === "extract");
    }

    base64Tab?.classList.toggle("active", base64Mode);

    if (fileContent) {
        fileContent.style.display = base64Mode ? "none" : "";
    }

    if (base64Content) {
        base64Content.style.display = base64Mode ? "flex" : "none";
    }

    if (base64Mode) {
        updateBase64ActionButton();
        return;
    }

    if (actionButton) {
        actionButton.textContent = activeConverterTab === "extract" ? "Extract" : "Convert";
        actionButton.disabled = activeConverterTab === "extract" ? extractFormats.length === 0 : convertFormats.length === 0;
    }

    if (outputTitle) {
        outputTitle.textContent = "Destination";
        outputTitle.title = activeConverterTab === "extract" ? "Click Extract to create the output file" : "Click Convert to create the output file";
    }
}

function processBase64Text(): void {
    const input = maybeById<HTMLTextAreaElement>("base64-input");
    const output = maybeById<HTMLTextAreaElement>("base64-output");
    const operation = maybeById<HTMLSelectElement>("base64-operation");
    const format = maybeById<HTMLSelectElement>("base64-format");

    if (!input || !output || !operation || !format) {
        return;
    }

    clearBase64Error();

    try {
        output.value = operation.value === "decode" ? decodeEncodedText(input.value, format.value) : encodeText(input.value, format.value);
        updateBase64CharacterCounts();

    } catch (error) {
        output.value = "";
        updateBase64CharacterCounts();
        showBase64Error(error instanceof Error ? error.message : "Encoding conversion failed.");
    }
}

function encodeText(
    value: string,
    format: string
): string {
    const bytes = new TextEncoder().encode(value);

    switch (format) {
        case "base64":
            return encodeBase64Bytes(bytes);

        case "base64url":
            return encodeBase64Bytes(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

        case "base32":
            return encodeBase32Bytes(bytes, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567");

        case "base32hex":
            return encodeBase32Bytes(bytes, "0123456789ABCDEFGHIJKLMNOPQRSTUV");

        case "hex":
            return encodeHexBytes(bytes);

        default:
            throw new Error("Unsupported encoding format.");
    }
}

function decodeEncodedText(
    value: string,
    format: string
): string {
    let bytes: Uint8Array;

    switch (format) {
        case "base64":
            bytes = decodeBase64Bytes(value, false);
            break;

        case "base64url":
            bytes = decodeBase64Bytes(value, true);
            break;

        case "base32":
            bytes = decodeBase32Bytes(value, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
            break;

        case "base32hex":
            bytes = decodeBase32Bytes(value, "0123456789ABCDEFGHIJKLMNOPQRSTUV");
            break;

        case "hex":
            bytes = decodeHexBytes(value);
            break;

        default:
            throw new Error("Unsupported encoding format.");
    }

    try {
        return new TextDecoder("utf-8", {fatal: true}).decode(bytes);

    } catch {
        throw new Error("The decoded data is not valid UTF-8 text.");
    }
}

function encodeBase64Bytes(
    bytes: Uint8Array
): string {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return window.btoa(binary);
}

function decodeBase64Bytes(
    value: string,
    urlSafe: boolean
): Uint8Array {
    const compact = value.replace(/\s+/g, "");

    if (!compact) {
        return new Uint8Array();
    }

    let normalized = urlSafe ? compact.replace(/-/g, "+").replace(/_/g, "/") : compact;

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
        throw new Error("The input is not valid Base64 data.");
    }

    if (normalized.includes("=") && !/={1,2}$/.test(normalized)) {
        throw new Error("The Base64 padding is invalid.");
    }

    normalized = normalized.replace(/=+$/g, "");

    const remainder = normalized.length % 4;

    if (remainder === 1) {
        throw new Error("The Base64 length is invalid.");
    }

    normalized += "=".repeat((4 - remainder) % 4);

    let binary: string;

    try {
        binary = window.atob(normalized);

    } catch {
        throw new Error("The input is not valid Base64 data.");
    }

    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function encodeBase32Bytes(
    bytes: Uint8Array,
    alphabet: string
): string {
    if (bytes.length === 0) {
        return "";
    }

    let output = "";
    let buffer = 0;
    let bits = 0;

    for (const byte of bytes) {
        buffer = (buffer << 8) | byte;
        bits += 8;

        while (bits >= 5) {
            bits -= 5;
            output += alphabet[(buffer >>> bits) & 31];
        }

        buffer &= (1 << bits) - 1;
    }

    if (bits > 0) {
        output += alphabet[
            (buffer << (5 - bits)) & 31
        ];
    }

    while (output.length % 8 !== 0) {
        output += "=";
    }

    return output;
}

function decodeBase32Bytes(
    value: string,
    alphabet: string
): Uint8Array {
    const compact = value.replace(/\s+/g, "").toUpperCase();

    if (!compact) {
        return new Uint8Array();
    }

    if (!/^[A-Z2-7=]+$/.test(compact) &&
        alphabet.startsWith("A")) {
        throw new Error("The input is not valid Base32 data.");
    }

    if (!/^[0-9A-V=]+$/.test(compact) &&
        alphabet.startsWith("0")) {
        throw new Error("The input is not valid Base32hex data.");
    }

    if (compact.includes("=") && !/=+$/.test(compact)) {
        throw new Error("The Base32 padding is invalid.");
    }

    const normalized = compact.replace(/=+$/g, "");
    let buffer = 0;
    let bits = 0;
    const output: number[] = [];

    for (const character of normalized) {
        const index = alphabet.indexOf(character);

        if (index < 0) {
            throw new Error(alphabet.startsWith("0") ? "The input is not valid Base32hex data." : "The input is not valid Base32 data.");
        }

        buffer = (buffer << 5) | index;
        bits += 5;

        if (bits >= 8) {
            bits -= 8;
            output.push((buffer >>> bits) & 255);
            buffer &= (1 << bits) - 1;
        }
    }

    if (bits > 0 && buffer !== 0) {
        throw new Error("The Base32 trailing bits are invalid.");
    }

    return new Uint8Array(output);
}

function encodeHexBytes(
    bytes: Uint8Array
): string {
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function decodeHexBytes(
    value: string
): Uint8Array {
    const compact = value.replace(/\s+/g, "");

    if (!compact) {
        return new Uint8Array();
    }

    if (!/^[0-9a-fA-F]+$/.test(compact)) {
        throw new Error("The input is not valid hexadecimal data.");
    }

    if (compact.length % 2 !== 0) {
        throw new Error("Hexadecimal data must contain an even number of characters.");
    }

    const output = new Uint8Array(compact.length / 2);

    for (let index = 0; index < compact.length; index += 2) {
        output[index / 2] = Number.parseInt(compact.slice(index, index + 2), 16);
    }

    return output;
}

function swapBase64Fields(): void {
    const input = maybeById<HTMLTextAreaElement>("base64-input");
    const output = maybeById<HTMLTextAreaElement>("base64-output");
    const operation = maybeById<HTMLSelectElement>("base64-operation");

    if (!input || !output || !operation) {
        return;
    }

    const previousInput = input.value;
    input.value = output.value;
    output.value = previousInput;
    operation.value = operation.value === "encode" ? "decode" : "encode";

    clearBase64Error();
    updateBase64CharacterCounts();
    updateBase64ActionButton();

    if (base64LiveMode) {
        processBase64Text();
    }

    input.focus();
}

function clearBase64Fields(): void {
    const input = maybeById<HTMLTextAreaElement>("base64-input");
    const output = maybeById<HTMLTextAreaElement>("base64-output");

    if (input) {
        input.value = "";
    }

    if (output) {
        output.value = "";
    }

    clearBase64Error();
    updateBase64CharacterCounts();
    updateBase64ActionButton();
}

function updateBase64CharacterCounts(): void {
    const input = maybeById<HTMLTextAreaElement>("base64-input");
    const output = maybeById<HTMLTextAreaElement>("base64-output");
    const inputCount = maybeById<HTMLElement>("base64-input-count");
    const outputCount = maybeById<HTMLElement>("base64-output-count");
    const inputLength = input?.value.length || 0;
    const outputLength = output?.value.length || 0;

    if (inputCount) {
        inputCount.textContent = `${inputLength} ${inputLength === 1 ? "character" : "characters"}`;
    }

    if (outputCount) {
        outputCount.textContent = `${outputLength} ${outputLength === 1 ? "character" : "characters"}`;
    }
}

function updateBase64ActionButton(): void {
    if (activeConverterTab !== "base64") {
        return;
    }

    const actionButton = maybeById<HTMLButtonElement>("converter-convert");
    const operation = maybeById<HTMLSelectElement>("base64-operation");
    const input = maybeById<HTMLTextAreaElement>("base64-input");

    if (!actionButton || !operation) {
        return;
    }

    actionButton.textContent = operation.value === "decode" ? "Decode" : "Encode";
    actionButton.disabled = base64LiveMode || !input?.value;
    actionButton.title = base64LiveMode ? "Conversion runs automatically in Live Mode" : "";
}

function clearBase64Error(): void {
    const error = maybeById<HTMLElement>("base64-error");

    if (!error) {
        return;
    }

    error.textContent = "";
    error.style.display = "none";
}

function showBase64Error(
    message: string
): void {
    const error = maybeById<HTMLElement>("base64-error");

    if (!error) {
        return;
    }

    error.textContent = message;
    error.style.display = "";
}

function updateBase64LiveModeButton(): void {
    const button = maybeById<HTMLButtonElement>("base64-live-mode");

    if (!button) {
        return;
    }

    button.textContent = base64LiveMode ? "Live Mode: ON" : "Live Mode: OFF";
    button.classList.toggle("primary", base64LiveMode);
    button.setAttribute("aria-pressed", String(base64LiveMode));

    const description = base64LiveMode ? "Disable automatic Base64 conversion" : "Enable automatic Base64 conversion";
    button.title = description;
    button.setAttribute("aria-label", description);
}
