export type Locale = "fr" | "en";

export const LOCALES: readonly Locale[] = ["fr", "en"];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "locale";

/** ISO 3166-1 alpha-2 codes where French is an official or dominant language. */
export const FRANCOPHONE_COUNTRIES: ReadonlySet<string> = new Set([
  // Central Africa
  "CG", "CD", "CM", "GA", "CF", "TD", "GQ", "BI", "RW",
  // West Africa & Indian Ocean
  "SN", "CI", "ML", "BF", "NE", "BJ", "TG", "GN", "MG", "KM", "DJ", "MU", "SC",
  // Maghreb
  "MA", "DZ", "TN",
  // Europe & Caribbean
  "FR", "BE", "CH", "LU", "MC", "HT",
]);

export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en";
}

/** Highest-weighted primary language subtag from an Accept-Language header. */
export function preferredLanguage(header?: string | null): string | null {
  if (!header) return null;
  const best = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="))?.split("=")[1];
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? parseFloat(q) : 1, index };
    })
    .filter((entry) => entry.lang && entry.lang !== "*" && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q || a.index - b.index)[0];
  return best?.lang ?? null;
}

export interface DetectInput {
  /** Explicit choice stored in the `locale` cookie. */
  cookie?: string | null;
  /** Visitor country, e.g. Vercel's `x-vercel-ip-country` header. */
  country?: string | null;
  acceptLanguage?: string | null;
}

/**
 * Cookie wins, then country, then browser language.
 * Unknown country (local dev, privacy proxies) falls back to the site default.
 */
export function detectLocale({ cookie, country, acceptLanguage }: DetectInput): Locale {
  if (isLocale(cookie)) return cookie;

  const code = country?.trim().toUpperCase() || null;
  if (code && FRANCOPHONE_COUNTRIES.has(code)) return "fr";

  const language = preferredLanguage(acceptLanguage);
  if (language === "fr") return "fr";
  if (language === "en") return "en";

  return code ? "en" : DEFAULT_LOCALE;
}
