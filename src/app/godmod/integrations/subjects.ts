/** Choices for the Google News subjects form (Admin › Intégrations). */

export const MAX_SUBJECTS = 3;

export const NEWS_COUNTRIES = [
  { code: "cg", label: "Congo-Brazzaville" },
  { code: "cd", label: "RD Congo" },
  { code: "cm", label: "Cameroun" },
  { code: "ga", label: "Gabon" },
  { code: "ci", label: "Côte d'Ivoire" },
  { code: "sn", label: "Sénégal" },
  { code: "fr", label: "France" },
  { code: "us", label: "États-Unis" },
] as const;

export const NEWS_LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "Anglais" },
] as const;

/** The subject typed by the admin, from a stored search ("startups Congo when:7d" → "startups Congo"). */
export function subjectOf(sourceUrl: string): string {
  try {
    return (new URL(sourceUrl).searchParams.get("q") ?? "").replace(/\s*\bwhen:\S+/gi, "").trim();
  } catch {
    return "";
  }
}
