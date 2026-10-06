export const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

export function parseDateTimestamp(
    value: string
): number | undefined {
    const timestamp = Date.parse(value);

    return Number.isNaN(timestamp) ? undefined : timestamp;
}

export function daysUnitLabel(
    days: number
): "day" | "days" {
    return days === 1 ? "day" : "days";
}
