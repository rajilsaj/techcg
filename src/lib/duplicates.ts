/*
 * Duplicates: the same article reached twice, either at two addresses
 * (http/https, www or not, /index.php/, /amp, tracking parameters) or under the
 * same headline (a press release several sites publish, a site that posts an
 * article twice as "…-2/", a Google News result for an article a feed already gave).
 */

const TRACKING = /^(utm_|fbclid$|gclid$|mc_|xtor$|at_|ref$|ref_src$|cmpid$|ncid$|ito$|_ga$|igshid$|amp$|outputType$)/i;

/**
 * One key per article address: "techcentral.co.za/ioco-profit/287279" for
 * http://www.techcentral.co.za/ioco-profit/287279/?utm_source=x and its variants.
 */
export function urlKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www\d?|m|amp|mobile)\./, "");
  let path = decodeSafe(url.pathname)
    .replace(/^\/index\.php(?=\/|$)/i, "")
    .replace(/\/(amp|amp\.html)\/?$/i, "")
    .replace(/\.amp(?=\.html?$)/i, "")
    .replace(/\/+$/, "");
  path = path.replace(/\/{2,}/g, "/");
  const params = [...url.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : "";
  return `${host}${path}${query}`.toLowerCase().slice(0, 1000);
}

function decodeSafe(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

const STOP = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "a", "au", "aux", "pour", "par", "sur", "dans", "avec", "son", "sa", "ses",
  "the", "a", "an", "of", "and", "in", "on", "for", "to", "with", "at", "by", "its", "is",
  "o", "os", "as", "um", "uma", "e", "em", "no", "na", "do", "da", "dos", "das", "para", "com",
]);

/** Headline reduced to its words: no accents, case or punctuation. */
export function titleKey(title: string | null | undefined): string {
  return (title ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** The headline without a trailing "- Site name" (only tried as an alternative: it can also be part of the title). */
const withoutSiteName = (title: string) => title.replace(/\s+[-–—|·]\s+[^-–—|·]{2,40}$/, "");

const words = (key: string) => new Set(key.split(" ").filter((w) => w.length > 1 && !STOP.has(w)));

/**
 * Same headline: identical once normalised, or (5 meaningful words or more) sharing at
 * least 85 % of their words — "X lève 5 M$" and "X lève 5 M$ pour…" are not merged,
 * "Kenya avails $100m to accelerate Digital Superhighway" and "Kenya avails $100m to
 * accelerate its Digital Superhighway" are.
 */
export function sameHeadline(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ka = [titleKey(a), titleKey(withoutSiteName(a))];
  const kb = [titleKey(b), titleKey(withoutSiteName(b))];
  return ka.some((x) => kb.some((y) => sameKey(x, y)));
}

function sameKey(ka: string, kb: string): boolean {
  if (!ka || !kb) return false;
  if (ka === kb) return ka.split(" ").length >= 4;
  const wa = words(ka);
  const wb = words(kb);
  if (wa.size < 5 || wb.size < 5) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.max(wa.size, wb.size) >= 0.85;
}

/** Window in which two articles with the same headline count as one. */
export const TITLE_WINDOW_DAYS = 14;

export interface DuplicateCandidate {
  id: number;
  title: string | null;
  originalTitle: string | null;
  urlKey: string | null;
  createdAt: Date;
  commentCount: number;
  points: number;
  viewCount: number;
}

/**
 * Groups of duplicates among `items`: same address key, or same headline within
 * TITLE_WINDOW_DAYS. Each group lists the one to keep first (most comments, then
 * points, then views, then the oldest).
 */
export function duplicateGroups<T extends DuplicateCandidate>(items: T[]): T[][] {
  const parent = new Map<number, number>();
  const find = (id: number): number => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const union = (a: number, b: number) => parent.set(find(a), find(b));
  for (const i of items) parent.set(i.id, i.id);

  const byKey = new Map<string, number>();
  for (const i of items) {
    if (!i.urlKey) continue;
    const seen = byKey.get(i.urlKey);
    if (seen !== undefined) union(i.id, seen);
    else byKey.set(i.urlKey, i.id);
  }

  const window = TITLE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const sorted = [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (let x = 0; x < sorted.length; x++) {
    for (let y = x + 1; y < sorted.length && sorted[y].createdAt.getTime() - sorted[x].createdAt.getTime() <= window; y++) {
      const a = sorted[x];
      const b = sorted[y];
      if (find(a.id) === find(b.id)) continue;
      if (headlines(a).some((ta) => headlines(b).some((tb) => sameHeadline(ta, tb)))) union(a.id, b.id);
    }
  }

  const groups = new Map<number, T[]>();
  for (const i of items) groups.set(find(i.id), [...(groups.get(find(i.id)) ?? []), i]);
  return [...groups.values()].filter((g) => g.length > 1).map((g) => g.sort(keepFirst));
}

const headlines = (i: DuplicateCandidate) => [i.originalTitle, i.title].filter((t): t is string => !!t);

/** The copy to keep: the one people engaged with, else the first published. */
export function keepFirst(a: DuplicateCandidate, b: DuplicateCandidate): number {
  return b.commentCount - a.commentCount || b.points - a.points || b.viewCount - a.viewCount || a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}
