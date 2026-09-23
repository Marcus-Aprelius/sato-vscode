export function bitsToBytesTooltip(
    value: string
): string {
    const match = value.match(/^(\d+)\s+bits?$/i);

    if (!match) {
        return "";
    }

    const bits = Number.parseInt(match[1], 10);

    if (!Number.isFinite(bits)) {
        return "";
    }

    return `${Math.ceil(bits / 8)} bytes`;
}

export function bytesToKilobytesTooltip(
    value: string
): string {
    const match = value.match(/^(\d+)\s+bytes?$/i);

    if (!match) {
        return "";
    }

    const bytes = Number.parseInt(match[1], 10);

    if (!Number.isFinite(bytes)) {
        return "";
    }

    return `${(bytes / 1024).toFixed(2)} KB`;
}
