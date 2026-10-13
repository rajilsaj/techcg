/** Display helpers for the visitor statistics. */

const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });

/** "CG" → "Congo-Brazzaville" (French names, as the browser knows them). */
export function countryName(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return "Inconnu";
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** "CG" → 🇨🇬 */
export function flag(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** 83_000 → "1 min 23 s" */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min ${String(total % 60).padStart(2, "0")} s`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

export const DEVICE_LABELS: Record<string, string> = {
  desktop: "Ordinateur",
  mobile: "Mobile",
  tablet: "Tablette",
  bot: "Robot",
};

/** "Ouesso, Sangha, Congo-Brazzaville" from whatever parts are known. */
export function placeLabel(city: string | null, region: string | null, country: string | null): string {
  return [city, region && region !== city ? region : null, country ? countryName(country) : null].filter(Boolean).join(", ") || "Inconnu";
}
