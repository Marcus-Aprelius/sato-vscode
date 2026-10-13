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

const BYTE_UNITS = ["bytes", "KB", "MB", "GB", "TB", "PB"] as const;

function formatByteSize(
    bytes: number
): string {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "";
    }

    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    if (unitIndex === 0) {
        return `${Math.trunc(value)} ${
            value === 1 ? "byte" : "bytes"
        }`;
    }

    const maximumFractionDigits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits })} ${BYTE_UNITS[unitIndex]}`;
}

export function bytesToKilobytesTooltip(
    value: string
): string {
    const match = value.trim().match(/^(\d+)\s+bytes?$/i);

    if (!match) {
        return "";
    }

    return formatByteSize(Number.parseInt(match[1], 10));
}
