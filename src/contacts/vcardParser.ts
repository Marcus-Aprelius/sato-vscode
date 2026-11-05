export interface VcardProperty {
    name: string;
    group?: string;
    parameters: Record<string, string[]>;
    value: string;
    rawValue: string;
}

export interface VcardContact {
    index: number;
    version: string;
    formattedName: string;
    familyName: string;
    givenName: string;
    additionalName: string;
    honorificPrefix: string;
    honorificSuffix: string;
    phones: VcardProperty[];
    emails: VcardProperty[];
    addresses: VcardProperty[];
    organizations: VcardProperty[];
    titles: VcardProperty[];
    notes: VcardProperty[];
    properties: VcardProperty[];
    warnings: string[];
}

export interface VcardParseResult {
    contacts: VcardContact[];
    warnings: string[];
}

export function parseVcardFile(
    source: string
): VcardParseResult {
    const normalizedSource = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const lines = unfoldVcardLines(normalizedSource.split("\n"));
    const contacts: VcardContact[] = [];
    const warnings: string[] = [];

    let currentLines: string[] | undefined;
    let startLine = 0;

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const upperLine = line.trim().toUpperCase();

        if (upperLine === "BEGIN:VCARD") {
            if (currentLines) {
                warnings.push(`A new vCard started before the previous card ended near line ${index + 1}.`);
            }

            currentLines = [];
            startLine = index + 1;
            continue;
        }

        if (upperLine === "END:VCARD") {
            if (!currentLines) {
                warnings.push(`Unexpected END:VCARD near line ${index + 1}.`);
                continue;
            }

            contacts.push(parseVcardContact(currentLines, contacts.length, startLine));
            currentLines = undefined;
            continue;
        }

        if (currentLines) {
            currentLines.push(line);
        } else if (line.trim()) {
            warnings.push(`Ignored content outside a vCard near line ${index + 1}.`);
        }
    }

    if (currentLines) {
        warnings.push(`The vCard beginning near line ${startLine} does not contain END:VCARD.`);
        contacts.push(parseVcardContact(currentLines, contacts.length, startLine));
    }

    if (contacts.length === 0) {
        warnings.push("The file does not contain any vCard contacts.");
    }

    return {contacts, warnings};
}

export function vcardPropertyTypes(
    property: VcardProperty
): string[] {
    return property.parameters.TYPE ?? [];
}

export function vcardPropertyTypeLabel(
    property: VcardProperty
): string {
    return vcardPropertyTypes(property).join(", ");
}

function parseVcardContact(
    lines: readonly string[],
    index: number,
    startLine: number
): VcardContact {
    const properties: VcardProperty[] = [];
    const warnings: string[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        if (!line.trim()) {
            continue;
        }

        const property = parseProperty(line);

        if (!property) {
            warnings.push(`Could not parse a property near line ${startLine + lineIndex + 1}.`);
            continue;
        }

        properties.push(property);
    }

    const version = firstPropertyValue(properties, "VERSION") || "Unknown";
    const nameParts = splitStructuredValue(firstPropertyValue(properties, "N"));
    const familyName = nameParts[0] ?? "";
    const givenName = nameParts[1] ?? "";
    const additionalName = nameParts[2] ?? "";
    const honorificPrefix = nameParts[3] ?? "";
    const honorificSuffix = nameParts[4] ?? "";

    const formattedName = firstPropertyValue(properties, "FN") ||
        buildFormattedName({familyName, givenName, additionalName, honorificPrefix, honorificSuffix }) ||
        firstPropertyValue(properties, "ORG") || `Contact ${index + 1}`;

    return {
        index,
        version,
        formattedName,
        familyName,
        givenName,
        additionalName,
        honorificPrefix,
        honorificSuffix,
        phones: propertiesByName(properties, "TEL"),
        emails: propertiesByName(properties, "EMAIL"),
        addresses: propertiesByName(properties, "ADR"),
        organizations: propertiesByName(properties, "ORG"),
        titles: propertiesByName(properties, "TITLE"),
        notes: propertiesByName(properties, "NOTE"),
        properties,
        warnings
    };
}

function parseProperty(
    line: string
): VcardProperty | undefined {
    const separatorIndex = findValueSeparator(line);

    if (separatorIndex < 0) {
        return undefined;
    }

    const descriptor = line.slice(0, separatorIndex);
    const rawValue = line.slice(separatorIndex + 1);
    const descriptorParts = splitDescriptor(descriptor);
    const qualifiedName = descriptorParts.shift()?.trim();

    if (!qualifiedName) {
        return undefined;
    }

    const nameParts = qualifiedName.split(".");
    const name = (nameParts.pop() || qualifiedName).toUpperCase();
    const group = nameParts.length > 0 ? nameParts.join(".") : undefined;
    const parameters: Record<string, string[]> = {};

    for (const parameter of descriptorParts) {
        addParameter(parameters, parameter);
    }

    const value = decodePropertyValue(rawValue, parameters);
    return {name, group, parameters, value, rawValue};
}

function addParameter(
    parameters: Record<string, string[]>,
    parameter: string
): void {
    const separatorIndex = parameter.indexOf("=");

    if (separatorIndex < 0) {
        addParameterValues(parameters, "TYPE", splitParameterValues(parameter));
        return;
    }

    const name = parameter.slice(0, separatorIndex).trim().toUpperCase();
    const value = parameter.slice(separatorIndex + 1).trim();

    if (!name) {
        return;
    }

    addParameterValues(parameters, name, splitParameterValues(value));
}

function addParameterValues(
    parameters: Record<string, string[]>,
    name: string,
    values: readonly string[]
): void {
    const existing = parameters[name] ?? [];

    for (const value of values) {
        const normalized = unquote(value.trim());

        if (normalized && !existing.some(current => current.toLowerCase() === normalized.toLowerCase())) {
            existing.push(normalized);
        }
    }

    parameters[name] = existing;
}

function decodePropertyValue(
    rawValue: string,
    parameters: Readonly<Record<string, string[]>>
): string {
    const encodings = parameters.ENCODING ?? [];
    const quotedPrintable = encodings.some(encoding => encoding.toUpperCase() === "QUOTED-PRINTABLE");
    const decoded = quotedPrintable ? decodeQuotedPrintable(rawValue) : rawValue;

    return unescapeVcardValue(decoded);
}

function decodeQuotedPrintable(
    value: string
): string {
    const bytes: number[] = [];

    for (let index = 0; index < value.length;) {
        const character = value[index];

        if (character === "=" && index + 2 < value.length) {
            const encodedByte = value.slice(index + 1, index + 3);

            if (/^[0-9A-F]{2}$/i.test(encodedByte)) {
                bytes.push(Number.parseInt(encodedByte, 16));
                index += 3;
                continue;
            }
        }

        const encodedCharacter = Buffer.from(character, "utf8");
        bytes.push(...encodedCharacter);
        index++;
    }

    return Buffer.from(bytes).toString("utf8");
}

function unfoldVcardLines(
    sourceLines: readonly string[]
): string[] {
    const unfolded: string[] = [];

    for (const sourceLine of sourceLines) {
        const line = sourceLine.replace(/\u0000/g, "");

        if (unfolded.length === 0) {
            unfolded.push(line);
            continue;
        }

        const previousIndex = unfolded.length - 1;
        const previousLine = unfolded[previousIndex];

        /*
         * vCard line folding joins lines beginning with a space
         * or tab to the previous logical line.
         */
        if (/^[ \t]/.test(line)) {
            unfolded[previousIndex] = previousLine + line.slice(1);
            continue;
        }

        /*
         * Quoted-Printable soft line breaks end with "=".
         * The equals sign is removed before joining the next line.
         */
        if (isQuotedPrintableLine(previousLine) && previousLine.endsWith("=")) {
            unfolded[previousIndex] = previousLine.slice(0, -1) + line;
            continue;
        }

        unfolded.push(line);
    }

    return unfolded;
}

function isQuotedPrintableLine(
    line: string
): boolean {
    const separatorIndex = findValueSeparator(line);

    if (separatorIndex < 0) {
        return false;
    }

    return line.slice(0, separatorIndex).split(";").slice(1).some(parameter => parameter.trim().toUpperCase() === "ENCODING=QUOTED-PRINTABLE");
}

function findValueSeparator(
    line: string
): number {
    let quoted = false;

    for (let index = 0; index < line.length; index++) {
        const character = line[index];

        if (character === "\"") {
            quoted = !quoted;
            continue;
        }

        if (character === ":" && !quoted) {
            return index;
        }
    }

    return -1;
}

function splitDescriptor(
    descriptor: string
): string[] {
    return splitOutsideQuotes(descriptor, ";");
}

function splitParameterValues(
    value: string
): string[] {
    return splitOutsideQuotes(value, ",");
}

function splitOutsideQuotes(
    value: string,
    separator: string
): string[] {
    const result: string[] = [];
    let current = "";
    let quoted = false;

    for (const character of value) {
        if (character === "\"") {
            quoted = !quoted;
            current += character;
            continue;
        }

        if (character === separator && !quoted) {
            result.push(current);
            current = "";
            continue;
        }

        current += character;
    }

    result.push(current);
    return result;
}

function splitStructuredValue(
    value: string
): string[] {
    const result: string[] = [];
    let current = "";
    let escaped = false;

    for (const character of value) {
        if (escaped) {
            current += escapedCharacter(character);
            escaped = false;
            continue;
        }

        if (character === "\\") {
            escaped = true;
            continue;
        }

        if (character === ";") {
            result.push(current.trim());
            current = "";
            continue;
        }

        current += character;
    }

    if (escaped) {
        current += "\\";
    }

    result.push(current.trim());
    return result;
}

function unescapeVcardValue(
    value: string
): string {
    let result = "";
    let escaped = false;

    for (const character of value) {
        if (escaped) {
            result += escapedCharacter(character);
            escaped = false;
            continue;
        }

        if (character === "\\") {
            escaped = true;
            continue;
        }

        result += character;
    }

    if (escaped) {
        result += "\\";
    }

    return result;
}

function escapedCharacter(
    character: string
): string {
    switch (character) {
        case "n":
        case "N":
            return "\n";

        case "\\":
            return "\\";

        case ",":
            return ",";

        case ";":
            return ";";

        case ":":
            return ":";

        default:
            return character;
    }
}

function firstPropertyValue(
    properties: readonly VcardProperty[],
    name: string
): string {
    return properties.find(property => property.name === name)?.value.trim() ?? "";
}

function propertiesByName(
    properties: readonly VcardProperty[],
    name: string
): VcardProperty[] {
    return properties.filter(property => property.name === name);
}

function buildFormattedName(
    name: {
        familyName: string;
        givenName: string;
        additionalName: string;
        honorificPrefix: string;
        honorificSuffix: string;
    }
): string {
    return [ name.honorificPrefix, name.givenName, name.additionalName, name.familyName, name.honorificSuffix ].map(value => value.trim()).filter(Boolean).join(" ");
}

function unquote(
    value: string
): string {
    if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
        return value.slice(1, -1);
    }

    return value;
}
