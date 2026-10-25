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

export function relativeDateTooltip(
    value: string,
    now = Date.now()
): string | undefined {
    const timestamp = parseDateTimestamp(value);

    if (timestamp === undefined) {
        return undefined;
    }

    const difference = now - timestamp;

    if (Math.abs(difference) < DAY_MILLISECONDS) {
        return difference >= 0 ? "Today" : "Tomorrow";
    }

    const days = Math.max(1, Math.floor(Math.abs(difference) / DAY_MILLISECONDS));

    if (difference > 0) {
        return `${days} ${daysUnitLabel(days)} ago`;
    }

    return days === 1 ? "In 1 day" : `In ${days} days`;
}
