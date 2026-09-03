export function readRecordField(
    record: unknown,
    methodNames: string[],
    fallback: string
): string {
    const obj = record as Record<string, unknown>;

    for (const methodName of methodNames) {
        const method = obj[methodName];

        if (typeof method === "function") {

            try {
                const value = method.call(record);

                if (value !== undefined && value !== null) {
                    return String(value);
                }

            } catch {
                // Ignore and try the next method.
            }
        }
    }

    return fallback;
}

export function callRecordSetter(
    record: unknown,
    methodName: string,
    value: string
): void {
    
    const obj = record as Record<string, unknown>;
    const method = obj[methodName];

    if (typeof method === "function") {
        method.call(record, value);
    }
}

export function readHeaderEmptyGroups(
    header: unknown
): Set<string> {

    const result = new Set<string>();
    const obj = header as Record<string, unknown>;
    const method = obj.getEmptyGroups;

    if (typeof method !== "function") {
        return result;
    }

    try {
        const value = method.call(header);

        if (Array.isArray(value)) {
            for (const item of value) {
                addEmptyGroup(result, item);
            }

            return result;
        }

        if (typeof value === "string") {
            for (const item of value.split(/\r?\n|,/)) {
                addEmptyGroup(result, item);
            }

            return result;
        }

        const iterable = value as {[Symbol.iterator]?: unknown;};

        if (value && typeof value === "object" && typeof iterable[Symbol.iterator] === "function") {
            for (const item of value as Iterable<unknown>) {
                addEmptyGroup(result, item);
            }
        }

    } catch {
        // Ignore unsupported header formats.
    }

    return result;
}

export function psafeEntryIdToIndex(
    entryId: string
): number {
    
    if (!entryId.startsWith("psafe-")) {return -1;}
    const raw = entryId.slice("psafe-".length);

    
    if (!/^\d+$/.test(raw)) {return -1;}
    const index = Number.parseInt(raw, 10);

    return Number.isFinite(index) ? index : -1;
}

export function groupIdToPsafeGroupPath(
    groupId: string
): string {
    
    if (!groupId || groupId === "root") {return "";}
    if (groupId.startsWith("group-")) {return groupId.slice("group-".length);}

    return "";
}

function addEmptyGroup(
    result: Set<string>,
    value: unknown
): void {
    const text = String(value).trim();

    if (text) {result.add(text);}
}
