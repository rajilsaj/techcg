import { prisma } from "./db";
import { absoluteHttpUrl, attributes, decodeEntities, fetchPublic, parseMetadata } from "./link-preview";
import { translateToFrench } from "./translate";
import { isGoogleNewsSource } from "./importer/google-news";

/*
 * The public card of an import source on /sources: logo, name, what the site
 * covers and its country, read from the site's homepage. An admin can correct
 * any of them (Admin › Importation › Modifier); a refresh never overwrites a
 * value an admin typed, it only fills empty ones.
 */

/** Read again after a month (logos and descriptions rarely change). */
const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

const COUNTRY_BY_TLD: Record<string, string> = {
  cg: "Congo",
  cd: "RD Congo",
  ga: "Gabon",
  cm: "Cameroun",
  ao: "Angola",
  bi: "Burundi",
  rw: "Rwanda",
  ci: "Côte d'Ivoire",
  sn: "Sénégal",
  ng: "Nigeria",
  ke: "Kenya",
  za: "Afrique du Sud",
  ma: "Maroc",
  fr: "France",
};

/** "Iwacu (Burundi)" → Burundi; else from the domain (.rw → Rwanda); else null. */
export function sourceCountry(name: string, url: string): string | null {
  const fromName = name.match(/\(([^)]+)\)\s*$/)?.[1]?.trim();
  if (fromName) return fromName === "RDC" ? "RD Congo" : fromName;
  try {
    const tld = new URL(url).hostname.split(".").pop() ?? "";
    return COUNTRY_BY_TLD[tld] ?? null;
  } catch {
    return null;
  }
}

/** "Iwacu (Burundi)" → "Iwacu". */
export const displayName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name;

interface IconLink {
  url: string;
  size: number;
  apple: boolean;
}

/** The site's best square logo: apple-touch-icon, then the largest declared icon, then /favicon.ico. */
export function bestIcon(html: string, pageUrl: URL): string {
  const icons: IconLink[] = [];
  for (const m of html.slice(0, 256 * 1024).matchAll(/<link\b[^>]*>/gi)) {
    const a = attributes(m[0]);
    const rel = (a.rel ?? "").toLowerCase().split(/\s+/);
    const apple = rel.some((r) => r.startsWith("apple-touch-icon"));
    if (!apple && !rel.includes("icon")) continue;
    const url = absoluteHttpUrl(a.href, pageUrl);
    if (!url) continue;
    const size = Math.max(0, ...(a.sizes ?? "").split(/\s+/).map((s) => parseInt(s, 10) || 0));
    icons.push({ url, size: size || (apple ? 180 : /\.svg(\?|$)/i.test(url) ? 512 : 32), apple });
  }
  icons.sort((x, y) => Number(y.apple) - Number(x.apple) || y.size - x.size);
  return icons[0]?.url ?? new URL("/favicon.ico", pageUrl).toString();
}

/** The homepage's meta / og / twitter description, cleaned; null if missing or too short to say anything. */
export function siteDescription(html: string): string | null {
  for (const m of html.slice(0, 256 * 1024).matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(m[0]);
    const key = (a.name || a.property || "").toLowerCase();
    if (!["description", "og:description", "twitter:description"].includes(key) || !a.content) continue;
    const text = decodeEntities(a.content).replace(/\s+/g, " ").trim();
    if (text.length >= 25) return text;
  }
  return null;
}

/** Reads a source's homepage and fills its empty card fields. Returns whether the page was read. */
export async function refreshSourceProfile(sourceId: number): Promise<boolean> {
  const source = await prisma.importSource.findUnique({
    where: { id: sourceId },
    select: { name: true, url: true, description: true, logoUrl: true, country: true },
  });
  if (!source || isGoogleNewsSource(source.url)) return false;

  const home = new URL("/", source.url);
  const page = await fetchPublic(home);
  if (!page.ok) {
    // Unreachable for now: keep the country, try again on the next automatic run.
    await prisma.importSource.update({ where: { id: sourceId }, data: { country: source.country ?? sourceCountry(source.name, source.url) } });
    return false;
  }
  const meta = parseMetadata(page.body, page.url, page.contentLanguage);
  // The site's own description only: a homepage's first paragraph is a news story, not what the site does.
  let description = source.description ?? siteDescription(page.body);
  let translated = true;
  if (!source.description && description && meta.lang && meta.lang !== "fr") {
    const fr = await translateToFrench(description, meta.lang);
    translated = !!fr;
    description = fr?.text ?? null;
  }

  await prisma.importSource.update({
    where: { id: sourceId },
    data: {
      description: description?.slice(0, 280) ?? null,
      logoUrl: source.logoUrl ?? bestIcon(page.body, page.url),
      country: source.country ?? sourceCountry(source.name, source.url),
      // Translation unavailable for now: read again on the next run.
      profiledAt: translated ? new Date() : null,
    },
  });
  return true;
}

/** Fills the cards of sources never read (or read over a month ago), within a time budget. */
export async function refreshDueProfiles(budgetMs: number): Promise<number> {
  const started = Date.now();
  const due = await prisma.importSource.findMany({
    where: { OR: [{ profiledAt: null }, { profiledAt: { lt: new Date(Date.now() - REFRESH_MS) } }] },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  let done = 0;
  for (const s of due) {
    if (Date.now() - started > budgetMs) break;
    if (await refreshSourceProfile(s.id).catch(() => false)) done++;
  }
  return done;
}
