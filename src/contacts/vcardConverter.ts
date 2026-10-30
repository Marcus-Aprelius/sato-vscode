import { parseVcardFile, vcardPropertyTypes } from "./vcardParser";

import type { VcardContact, VcardProperty} from "./vcardParser";

export type VcardTargetVersion = "3.0" | "4.0";
export type VcardExportFormat = | "TXT" | "YAML" | "JSON";

const EXCLUDED_PROPERTIES = new Set(["BEGIN", "END","VERSION", "N", "FN"]);

export function convertVcardFile(
    source: string,
    targetVersion: VcardTargetVersion
): string {
    const parsed = parseVcardFile(source);

    if (parsed.contacts.length === 0) {
        throw new Error("The file does not contain any vCard contacts.");
    }

    return parsed.contacts.map(contact => serializeContact(contact, targetVersion)).join("");
}

export function exportVcardFile(
    source: string,
    outputFormat: VcardExportFormat
): string {
    const parsed = parseVcardFile(source);

    if (parsed.contacts.length === 0) {
        throw new Error("The file does not contain any vCard contacts.");
    }

    switch (outputFormat) {
        case "TXT":
            return exportVcardAsText(parsed.contacts);

        case "YAML":
            return exportVcardAsYaml(parsed.contacts);

        case "JSON":
            return exportVcardAsJson(parsed.contacts);
    }
}

function exportVcardAsText(
    contacts: readonly VcardContact[]
): string {
    return contacts.map(contact => {
        const lines: string[] = [contact.formattedName];

        for (const phone of contact.phones) {
            const value = phone.value.replace(/^tel:/i, "").trim();

            if (value) {
                lines.push(value);
            }
        }

        return lines.join("\n");
    }).join("\n\n") + "\n";
}

function exportVcardAsJson(
    contacts: readonly VcardContact[]
): string {
    const result = {
        entries: contacts.map(contact => ({
            text: contact.formattedName,
            number: contact.phones[0]?.value.replace(/^tel:/i, "").trim() ?? ""
        }))
    };

    return JSON.stringify(result, null, 2) + "\n";
}

function exportVcardAsYaml(
    contacts: readonly VcardContact[]
): string {
    const lines: string[] = [];

    for (const contact of contacts) {
        const phone = contact.phones[0]?.value.replace(/^tel:/i, "").trim() ?? "";
        lines.push(`- name: ${contact.formattedName}`, `  number: ${yamlString(phone)}`);
    }

    return lines.join("\n") + "\n";
}

function addTextProperties(
    lines: string[],
    label: string,
    properties: readonly VcardProperty[]
): void {
    for (let index = 0; index < properties.length; index++) {
        const property = properties[index];
        const types = vcardPropertyTypes(property);
        const numberedLabel = properties.length > 1 ? `${label} ${index + 1}` : label;
        const typeLabel = types.length > 0 ? ` (${types.join(", ")})` : "";

        lines.push(`${numberedLabel}${typeLabel}: ${property.value}`);
    }
}

function addYamlProperties(
    lines: string[],
    name: string,
    properties: readonly VcardProperty[]
): void {
    if (properties.length === 0) {
        lines.push(`    ${name}: []`);

        return;
    }

    lines.push(`    ${name}:`);

    for (const property of properties) {
        const types = vcardPropertyTypes(property);

        lines.push(`      - value: ${yamlString(property.value)}`);

        if (types.length === 0) {
            lines.push("        types: []");
            continue;
        }

        lines.push("        types:");

        for (const type of types) {
            lines.push(`          - ${yamlString(type)}`);
        }
    }
}

function yamlString(
    value: string
): string {
    return JSON.stringify(value);
}

function serializeContact(
    contact: VcardContact,
    targetVersion: VcardTargetVersion
): string {
    const lines: string[] = ["BEGIN:VCARD", `VERSION:${targetVersion}`, serializeName(contact, targetVersion), serializeFormattedName(contact.formattedName)];

    for (const property of contact.properties) {
        if (EXCLUDED_PROPERTIES.has(property.name)) {
            continue;
        }

        const serialized = serializeProperty(property, targetVersion);

        if (serialized) {
            lines.push(serialized);
        }
    }

    lines.push("END:VCARD");
    return lines.map(line => foldVcardLine(line)).join("\r\n") + "\r\n";
}

function serializeName(
    contact: VcardContact,
    targetVersion: VcardTargetVersion
): string {
    const values = [contact.familyName, contact.givenName, contact.additionalName, contact.honorificPrefix, contact.honorificSuffix]
        .map(value => escapeStructuredValue(value, targetVersion));

    return `N:${values.join(";")}`;
}

function serializeFormattedName(
    formattedName: string
): string {
    return `FN:${escapeTextValue(formattedName)}`;
}

function serializeProperty(
    property: VcardProperty,
    targetVersion: VcardTargetVersion
): string | undefined {
    if (!property.name) {
        return undefined;
    }

    const name = property.group ? `${property.group}.${property.name}`: property.name;
    const parameters = serializeParameters(property, targetVersion);
    const value = serializePropertyValue(property, targetVersion);

    return `${name}${parameters}:${value}`;
}

function serializeParameters(
    property: VcardProperty,
    targetVersion: VcardTargetVersion
): string {
    const result: string[] = [];
    const types = normalizedTypes(property);

    if (types.length > 0) {
        if (targetVersion === "4.0") {
            result.push(`TYPE=${types.map(type => quoteParameterValue(type)).join(",")}`);
        } else {
            result.push(`TYPE=${types.join(",")}`);
        }
    }

    for (const [parameterName, parameterValues] of Object.entries(property.parameters)) {
        const upperName = parameterName.toUpperCase();

        if (upperName === "TYPE" || upperName === "CHARSET" || upperName === "ENCODING") {
            continue;
        }

        const values = parameterValues.map(value => value.trim()).filter(Boolean);

        if (values.length === 0) {
            continue;
        }

        if (targetVersion === "4.0" && !isVcard4ParameterAllowed(upperName)) {
            continue;
        }

        result.push(`${upperName}=${values.map(value => targetVersion === "4.0" ? quoteParameterValue(value) : value).join(",")}`);
    }

    return result.length > 0 ? `;${result.join(";")}` : "";
}

function serializePropertyValue(
    property: VcardProperty,
    targetVersion: VcardTargetVersion
): string {
    switch (property.name) {
        case "ADR":
            return serializeStructuredProperty(property.value, targetVersion);

        case "ORG":
            return serializeStructuredProperty(property.value, targetVersion);

        case "GEO":
            return serializeGeoValue(property.value, targetVersion);

        case "TEL":
            return serializeTelephoneValue(property.value, targetVersion);

        case "EMAIL":
        case "TITLE":
        case "ROLE":
        case "NOTE":
        case "NICKNAME":
        case "CATEGORIES":
        case "LABEL":
        case "UID":
        case "URL":
        case "SOURCE":
        case "BDAY":
        case "ANNIVERSARY":
        case "REV":
        case "TZ":
        case "LANG":
        case "GENDER":
        case "MAILER":
        case "PRODID":
        case "CLASS":
        case "SORT-STRING":
            return escapeTextValue(property.value);

        default:
            return escapeTextValue(property.value);
    }
}

function serializeStructuredProperty(
    value: string,
    targetVersion: VcardTargetVersion
): string {
    return splitStructuredValue(value).map(part => escapeStructuredValue(part, targetVersion)).join(";");
}

function serializeGeoValue(
    value: string,
    targetVersion: VcardTargetVersion
): string {
    const trimmed = value.trim();

    if (targetVersion === "4.0" && trimmed && !trimmed.toLowerCase().startsWith("geo:")) {
        return `geo:${trimmed.replace(";", ",")}`;
    }

    return escapeTextValue(trimmed);
}

function serializeTelephoneValue(
    value: string,
    targetVersion: VcardTargetVersion
): string {
    const phone = value.trim().replace(/^tel:/i, "");

    if (targetVersion === "4.0" && looksLikeTelephoneNumber(phone)) {
        return `tel:${phone}`;
    }

    return escapeTextValue(phone);
}

function normalizedTypes(
    property: VcardProperty
): string[] {
    const result: string[] = [];

    for (const type of vcardPropertyTypes(property)) {
        const normalized = type.trim().toLowerCase();

        if (normalized && !result.includes(normalized)) {
            result.push(normalized);
        }
    }

    return result;
}

function isVcard4ParameterAllowed(
    parameterName: string
): boolean {
    return (
        parameterName === "LANGUAGE" ||
        parameterName === "VALUE" ||
        parameterName === "PREF" ||
        parameterName === "ALTID" ||
        parameterName === "PID" ||
        parameterName === "MEDIATYPE" ||
        parameterName === "CALSCALE" ||
        parameterName === "SORT-AS" ||
        parameterName === "GEO" ||
        parameterName === "TZ" ||
        parameterName.startsWith("X-")
    );
}

function escapeTextValue(
    value: string
): string {
    return value.replace(/\\/g, "\\\\").replace(/\r\n?|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function escapeStructuredValue(
    value: string,
    _targetVersion: VcardTargetVersion
): string {
    return value.replace(/\\/g, "\\\\").replace(/\r\n?|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function splitStructuredValue(
    value: string
): string[] {
    const result: string[] = [];
    let current = "";
    let escaped = false;

    for (const character of value) {
        if (escaped) {
            current += character;
            escaped = false;
            continue;
        }

        if (character === "\\") {
            escaped = true;
            current += character;
            continue;
        }

        if (character === ";") {
            result.push(unescapeStructuredPart(current));
            current = "";
            continue;
        }

        current += character;
    }

    result.push(unescapeStructuredPart(current));

    return result;
}

function unescapeStructuredPart(
    value: string
): string {
    return value.replace(/\\n/gi, "\n").replace(/\\;/g, ";").replace(/\\,/g, ",").replace(/\\\\/g, "\\").trim();
}

function quoteParameterValue(
    value: string
): string {
    if (!/[,:;]/.test(value)) {
        return value;
    }

    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}

function looksLikeTelephoneNumber(
    value: string
): boolean {
    return /^[+*#0-9().\-\s]+$/.test(value);
}

function foldVcardLine(
    line: string
): string {
    const maximumOctets = 75;

    if (Buffer.byteLength(line, "utf8") <= maximumOctets) {
        return line;
    }

    const result: string[] = [];
    let current = "";

    for (const character of line) {
        const candidate = current + character;
        const limit = result.length === 0 ? maximumOctets : maximumOctets - 1;

        if (current && Buffer.byteLength(candidate, "utf8") > limit) {
            result.push(current);
            current = character;
            continue;
        }

        current = candidate;
    }

    if (current) {
        result.push(current);
    }

    return result.map((part, index) => index === 0 ? part : ` ${part}`).join("\r\n");
}
