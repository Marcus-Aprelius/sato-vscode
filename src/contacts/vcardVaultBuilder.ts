import * as path from "path";
import type * as vscode from "vscode";

import type { GroupView, VaultStats } from "../vault";
import type { SupportedDirectoryFile } from "../archives";
import type { VcardContact, VcardProperty } from "./vcardParser";
import { parseVcardFile, vcardPropertyTypeLabel } from "./vcardParser";
import type { CertificateVault, CryptoFileInput } from "../certificates";

export function buildVcardVault(
    uri: vscode.Uri,
    bytes: Uint8Array,
    supportedFiles: SupportedDirectoryFile[]
): CertificateVault {
    const text = Buffer.from(bytes).toString("utf8");
    const parsed = parseVcardFile(text);
    const fileName = path.basename(uri.fsPath);
    const groupId = vcardGroupId(uri.fsPath);
    const sourceFile: CryptoFileInput = {uri, bytes};
    const entries: GroupView["entries"] = parsed.contacts.map(contact => createContactEntry(contact, uri.fsPath, fileName, parsed.warnings));
    const group: GroupView = { id: groupId, parentId: "root", name: fileName, groups: [], entries };
    const root: GroupView = { id: "root", parentId: null, name: "Contacts", groups: [group], entries: [] };
    const filesByEntryId: Record<string, CryptoFileInput> = {};

    for (const entry of entries) {
        filesByEntryId[entry.id] = sourceFile;
    }

    const stats: VaultStats = {
        groups: 2,
        entries: entries.length,
        duplicates: countDuplicateContacts(parsed.contacts),
        expired: 0,
        emptyGroups: 0,
        weak: 0
    };

    return {
        tree: root,
        stats,
        supportedFiles,
        selectedEntryId: entries[0]?.id ?? "",
        privateKeysByEntryId: {},
        filesByEntryId
    };
}

function createContactEntry(
    contact: VcardContact,
    filePath: string,
    fileName: string,
    fileWarnings: readonly string[]
): GroupView["entries"][number] {
    const entryId = vcardEntryId(filePath, contact.index);
    const phoneValues = formatProperties(contact.phones);
    const emailValues = formatProperties(contact.emails);

    const addressValues = formatProperties(contact.addresses, formatAddress);
    const organizationValues = contact.organizations.map(property => formatOrganization(property.value)).filter(Boolean).join("\n");
    const titleValues = contact.titles.map(property => property.value.trim()).filter(Boolean).join("\n");
    const noteValues = contact.notes.map(property => property.value.trim()).filter(Boolean).join("\n");
    const contactWarnings = [...fileWarnings, ...contact.warnings];

    const values: Record<string, string> = {
        Type: "vCard Contact",
        Version: contact.version,
        "Formatted name": contact.formattedName,
        "Family name": contact.familyName,
        "Given name": contact.givenName,
        "Additional name": contact.additionalName,
        Prefix: contact.honorificPrefix,
        Suffix: contact.honorificSuffix,
        Phone: phoneValues,
        Email: emailValues,
        Address: addressValues,
        Organization: organizationValues,
        Title: titleValues,
        Note: noteValues,
        Properties: String(contact.properties.length),
        Warnings: contactWarnings.join("\n"),
        File: fileName,
        "File path": filePath,
        Summary: contactSummary(contact)
    };

    const fields = Object.keys(values).filter(field => values[field] !== "");

    return {
        id: entryId,
        parentId: vcardGroupId(filePath),
        title: contact.formattedName,
        username: firstPropertyValue(contact.emails),
        url: firstPropertyValue(contact.properties.filter(property => property.name === "URL")),
        notes: noteValues,
        passwordLength: 0,
        hasPassword: false,
        weak: false,
        expired: false,
        fields,
        values,
        readOnly: true
    };
}

function formatProperties(
    properties: readonly VcardProperty[],
    valueFormatter: (value: string) => string = value => value.trim()
): string {
    return properties.map(property => {
        const value = valueFormatter(property.value);

        if (!value) {
            return "";
        }

        const type = vcardPropertyTypeLabel(property);
        return type ? `${value} (${type})` : value;
    }).filter(Boolean).join("\n");
}

function formatAddress(
    value: string
): string {
    const parts = splitStructuredValue(value);

    /*
     * ADR components:
     * post-office box;
     * extended address;
     * street;
     * locality;
     * region;
     * postal code;
     * country
     */
    const formatted = [parts[2], parts[1], parts[3], parts[4], parts[5], parts[6], parts[0]].map(part => part.trim()).filter(Boolean).join(", ");
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

function contactSummary(
    contact: VcardContact
): string {
    const parts: string[] = [];

    if (contact.phones.length > 0) {
        parts.push(pluralize(contact.phones.length, "phone number", "phone numbers"));
    }

    if (contact.emails.length > 0) {
        parts.push(pluralize(contact.emails.length, "email address", "email addresses"));
    }

    if (contact.addresses.length > 0) {
        parts.push(pluralize(contact.addresses.length, "postal address", "postal addresses"));
    }

    if (parts.length === 0) {
        return `vCard ${contact.version} contact.`;
    }

    return `vCard ${contact.version} contact with ${parts.join(", ")}.`;
}

function pluralize(
    count: number,
    singular: string,
    plural: string
): string {
    return `${count} ${count === 1 ? singular : plural}`;
}

function firstPropertyValue(
    properties: readonly VcardProperty[]
): string {
    return properties[0]?.value.trim() ?? "";
}

function countDuplicateContacts(
    contacts: readonly VcardContact[]
): number {
    const identifiers = new Set<string>();
    let duplicates = 0;

    for (const contact of contacts) {
        const identifier = contactIdentifier(contact);

        if (!identifier) {
            continue;
        }

        if (identifiers.has(identifier)) {
            duplicates++;
            continue;
        }

        identifiers.add(identifier);
    }

    return duplicates;
}

function contactIdentifier(
    contact: VcardContact
): string {
    const phone = contact.phones[0]?.value.replace(/\s+/g, "").toLowerCase() ?? "";
    const email = contact.emails[0]?.value.trim().toLowerCase() ?? "";
    const name = contact.formattedName.trim().toLowerCase();

    if (phone) {
        return `phone:${phone}`;
    }

    if (email) {
        return `email:${email}`;
    }

    return name ? `name:${name}` : "";
}

function vcardGroupId(
    filePath: string
): string {
    return `vcard-group:${filePath}`;
}

function vcardEntryId(
    filePath: string,
    contactIndex: number
): string {
    return `vcard-entry:${filePath}:${contactIndex}`;
}
