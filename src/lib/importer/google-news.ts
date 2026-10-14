import type { FoundArticle } from "./parse";
import { getSerpApiKey } from "../serpapi";

/**
 * Google News through SerpApi (https://serpapi.com/google-news-api).
 *
 * A source is stored as a SerpApi address without the key, e.g.
 * https://serpapi.com/search?engine=google_news&q=startup+Congo+when:7d&gl=cg&hl=fr
 * The key (Admin › Intégrations, else SERPAPI_API_KEY) is added only at request time.
 */

const ENDPOINT = "https://serpapi.com/search.json";
/** Search parameters an admin may set; anything else (api_key included) is dropped. */
const ALLOWED_PARAMS = ["q", "gl", "hl", "so", "topic_token", "publication_token", "section_token", "story_token", "kgmid"] as const;
const TIMEOUT_MS = 20_000;

/** Each search spends SerpApi credits, so a Google News source is re-read at most every 6 hours. */
export const GOOGLE_NEWS_INTERVAL_MINUTES = 6 * 60;

export function isGoogleNewsSource(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)serpapi\.com$/i.test(u.hostname) && u.searchParams.get("engine") === "google_news";
  } catch {
    return false;
  }
}

/** The stored form of a search: engine=google_news plus the allowed parameters, never the key. */
export function googleNewsSourceUrl(params: Partial<Record<(typeof ALLOWED_PARAMS)[number], string | null | undefined>>): string {
  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", "google_news");
  for (const key of ALLOWED_PARAMS) {
    const value = params[key]?.trim();
    if (value) url.searchParams.set(key, value.slice(0, 300));
  }
  // SerpApi refuses `so` (sort) together with `q`; searches stay fresh with "when:7d" and are sorted on import.
  if (url.searchParams.has("q")) url.searchParams.delete("so");
  return url.toString();
}

/** Same source address with only the allowed parameters (an api_key pasted by mistake is removed). */
export function cleanGoogleNewsUrl(raw: string): string {
  const u = new URL(raw);
  return googleNewsSourceUrl(Object.fromEntries(ALLOWED_PARAMS.map((k) => [k, u.searchParams.get(k)])));
}

/** "Congo startup · cg · fr" for the admin list. */
export function describeGoogleNews(raw: string): string {
  const u = new URL(cleanGoogleNewsUrl(raw));
  const what = u.searchParams.get("q")?.replace(/\s*when:\S+/gi, "").trim() || (u.searchParams.get("topic_token") ? "rubrique Google News" : "à la une");
  return [`« ${what} »`, u.searchParams.get("gl")?.toUpperCase(), u.searchParams.get("hl"), u.searchParams.get("so") === "1" ? "par date" : null]
    .filter(Boolean)
    .join(" · ");
}

interface NewsResult {
  title?: string;
  link?: string;
  thumbnail?: string;
  iso_date?: string;
  date?: string;
  source?: { name?: string };
  highlight?: NewsResult;
  stories?: NewsResult[];
}

const httpUrl = (value: string | undefined): string | null => {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
};

const parseDate = (r: NewsResult): Date | null => {
  for (const value of [r.iso_date, r.date?.replace(/,\s*([+-]\d{4}).*$/, " $1")]) {
    const time = value ? Date.parse(value) : NaN;
    if (!Number.isNaN(time)) return new Date(time);
  }
  return null;
};

/** Articles in a SerpApi Google News response; story clusters are flattened. */
export function parseGoogleNews(json: unknown, language: string | null): FoundArticle[] {
  const results = (json as { news_results?: NewsResult[] })?.news_results;
  if (!Array.isArray(results)) return [];

  const flat: NewsResult[] = [];
  for (const r of results) {
    if (r.link) flat.push(r);
    if (r.highlight?.link) flat.push(r.highlight);
    for (const s of r.stories ?? []) if (s?.link) flat.push(s);
  }

  return flat.flatMap((r) => {
    const url = httpUrl(r.link);
    const title = r.title?.trim();
    if (!url || !title) return [];
    return [
      {
        title,
        url,
        publishedAt: parseDate(r),
        summary: null, // Google News gives no excerpt; the preview job reads it from the article.
        image: httpUrl(r.thumbnail),
        keywords: r.source?.name ? [r.source.name] : [],
        language,
      },
    ];
  });
}

/** Runs the stored search. Errors are short French messages for the admin. */
export async function searchGoogleNews(sourceUrl: string): Promise<{ language: string | null; articles: FoundArticle[] } | { error: string }> {
  const key = await getSerpApiKey();
  if (!key) return { error: "clé SerpApi manquante (Admin › Intégrations)" };

  const stored = new URL(cleanGoogleNewsUrl(sourceUrl));
  const request = new URL(ENDPOINT);
  stored.searchParams.forEach((value, name) => request.searchParams.set(name, value));
  request.searchParams.set("api_key", key);

  let response: Response;
  try {
    response = await fetch(request, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    return { error: "SerpApi ne répond pas" };
  }

  let body: { error?: string } & Record<string, unknown>;
  try {
    body = await response.json();
  } catch {
    return { error: `réponse SerpApi illisible (${response.status})` };
  }
  if (!response.ok || body.error) {
    // SerpApi's own message (quota, invalid key…); never echo the request URL, which holds the key.
    if (/no results/i.test(String(body.error ?? ""))) return { language: null, articles: [] };
    return { error: `SerpApi : ${String(body.error ?? response.status).slice(0, 160)}` };
  }

  const language = stored.searchParams.get("hl")?.slice(0, 2).toLowerCase() ?? null;
  return { language, articles: parseGoogleNews(body, language) };
}
