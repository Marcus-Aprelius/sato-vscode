import * as path from "path";

import { parseVcardFile, vcardPropertyTypeLabel } from "./vcardParser";

import type { VcardContact, VcardParseResult, VcardProperty } from "./vcardParser";

export interface VcardInfoResult {
    title: string;
    rows: [string, string][];
}

export function collectDecodedVcardInfo(
    source: string,
    filePath: string
): VcardInfoResult {
    const parsed = parseVcardFile(source);
    const rows: [string, string][] = [];

    addRow(rows, "File name", path.basename(filePath));
    addRow(rows, "Contacts", String(parsed.contacts.length));

    for (let index = 0; index < parsed.contacts.length; index++) {
        const contact = parsed.contacts[index];
        const prefix = `${index + 1}. ${contact.formattedName}`;

        addRow(rows, prefix, formatDecodedContact(contact));
    }

    if (parsed.warnings.length > 0) {
        addRow(rows, "File warnings", parsed.warnings.join("\n"));
    }

    addRow(rows, "File path", filePath);
    return { title: "Decoded vCard Info", rows };
}

export function collectVcardFileInfo(
    source: string,
    filePath: string,
    fileSize: number
): VcardInfoResult {
    const parsed = parseVcardFile(source);
    const versions = uniqueValues(parsed.contacts.map(contact => contact.version));
    const phoneCount = countProperties(parsed.contacts, contact => contact.phones);
    const emailCount = countProperties(parsed.contacts, contact => contact.emails);
    const addressCount = countProperties(parsed.contacts, contact => contact.addresses);
    const organizationCount = countProperties(parsed.contacts, contact => contact.organizations);
    const contactWarnings = parsed.contacts.flatMap(contact => contact.warnings);
    const warnings = [...parsed.warnings, ...contactWarnings];
    const rows: [string, string][] = [];

    addRow(rows, "File name", path.basename(filePath));
    addRow(rows, "Type", "vCard contact file");
    addRow(rows, "Versions", versions.join(", "));
    addRow(rows, "Contacts", String(parsed.contacts.length));
    addRow(rows, "Phone numbers", String(phoneCount));
    addRow(rows, "Email addresses", String(emailCount));
    addRow(rows, "Postal addresses", String(addressCount));
    addRow(rows, "Organizations", String(organizationCount));
    addRow(rows, "Encoding", detectEncoding(parsed));
    addRow(rows, "Character set", detectCharacterSets(parsed));
    addRow(rows, "File size", `${fileSize} bytes`);
    addRow(rows, "Warnings", warnings.length > 0 ? warnings.join("\n") : "None");
    addRow(rows, "File path", filePath);

    return {title: "vCard File Info", rows};
}

function formatDecodedContact(
    contact: VcardContact
): string {
    const lines: string[] = [];

    addLine(lines, "Version", contact.version);
    addLine(lines, "Formatted name", contact.formattedName);
    addLine(lines, "Family name", contact.familyName);
    addLine(lines, "Given name", contact.givenName);
    addLine(lines, "Additional name", contact.additionalName);
    addLine(lines, "Prefix", contact.honorificPrefix);
    addLine(lines, "Suffix", contact.honorificSuffix);
    addProperties(lines, "Phone", contact.phones);
    addProperties(lines, "Email", contact.emails);
    addProperties(lines, "Address", contact.addresses, formatAddress);
    addProperties(lines, "Organization", contact.organizations, formatOrganization);
    addProperties(lines, "Title", contact.titles);
    addProperties(lines, "Note", contact.notes);

    if (contact.warnings.length > 0) {
        addLine(lines, "Warnings", contact.warnings.join("; "));
    }

    return lines.join("\n");
}

function addProperties(
    lines: string[],
    label: string,
    properties: readonly VcardProperty[],
    formatter: (value: string) => string =
        value => value.trim()
): void {
    for (let index = 0; index < properties.length; index++) {
        const property = properties[index];
        const value = formatter(property.value);

        if (!value) {
            continue;
        }

        const type = vcardPropertyTypeLabel(property);
        const numberedLabel = properties.length > 1 ? `${label} ${index + 1}` : label;

        addLine(lines, type ? `${numberedLabel} (${type})` : numberedLabel, value);
    }
}

function formatAddress(
    value: string
): string {
    const parts = splitStructuredValue(value);
    const formatted = [ parts[2],parts[1],parts[3],parts[4],parts[5],parts[6],parts[0] ].map(part => part?.trim() ?? "").filter(Boolean).join(", ");

    return formatted || value.trim();
}

function formatOrganization(
    value: string
): string {
    return splitStructuredValue(value).map(part => part.trim()).filter(Boolean).join(" / ");
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
            result.push(current);
            current = "";
            continue;
        }

        current += character;
    }

    if (escaped) {
        current += "\\";
    }

    result.push(current);
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

        case ";":
            return ";";

        case ",":
            return ",";

        default:
            return character;
    }
}

function detectEncoding(
    parsed: VcardParseResult
): string {
    const encodings = collectParameterValues(parsed, "ENCODING");
    return encodings.length > 0 ? encodings.join(", ") : "Plain text";
}

function detectCharacterSets(
    parsed: VcardParseResult
): string {
    const characterSets = collectParameterValues(parsed, "CHARSET");
    return characterSets.length > 0 ? characterSets.join(", ") : "Not declared";
}

function collectParameterValues(
    parsed: VcardParseResult,
    parameterName: string
): string[] {
    const values: string[] = [];

    for (const contact of parsed.contacts) {
        for (const property of contact.properties) {
            const parameterValues = property.parameters[parameterName] ?? [];

            for (const value of parameterValues) {
                const normalized = value.trim();

                if (normalized &&!values.some(existing => existing.toLowerCase() === normalized.toLowerCase())) {
                    values.push(normalized);
                }
            }
        }
    }

    return values;
}

function countProperties(
    contacts: readonly VcardContact[],
    selector: (contact: VcardContact) => readonly VcardProperty[]
): number {
    return contacts.reduce((total, contact) => total + selector(contact).length, 0);
}

function uniqueValues(
    values: readonly string[]
): string[] {
    const result: string[] = [];

    for (const value of values) {
        const normalized = value.trim();

        if (normalized && !result.some( existing => existing.toLowerCase() === normalized.toLowerCase())) {
            result.push(normalized);
        }
    }

    return result;
}

function addRow(
    rows: [string, string][],
    label: string,
    value: string
): void {
    if (!value) {
        return;
    }

    rows.push([label, value]);
}

function addLine(
    lines: string[],
    label: string,
    value: string
): void {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
        return;
    }

    lines.push(`${label}: ${normalizedValue}`);
}
