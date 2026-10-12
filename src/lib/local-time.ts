/**
 * Conversions between dates and <input type="datetime-local"> values in
 * Brazzaville time (UTC+1, no daylight saving), the site's reference time zone.
 */
const OFFSET_MS = 60 * 60 * 1000;

/** Date → "2026-10-12T14:30" in Brazzaville time. */
export function toLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 16);
}

/** "2026-10-12T14:30" (Brazzaville time) → Date, or null if malformed. */
export function fromLocalInput(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}:00Z`);
  return Number.isNaN(time) ? null : new Date(time - OFFSET_MS);
}

/** "12 oct. 2026 à 14:30" in Brazzaville time. */
export function formatLocalDateTime(date: Date): string {
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Brazzaville",
  });
}
