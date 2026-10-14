import { prisma } from "../db";
import { decodeEntities, fetchPublic, type PreviewFailure } from "../link-preview";
import { analyzeArticle } from "../scraper/article";
import { worthKeeping } from "../scraper/image-size";
import { stripLeadingTitle } from "../excerpt";
import { calculateRankScore } from "../ranking";
import { slugify } from "../taxonomy";
import { frenchTitle, translateToFrench } from "../translate";
import { detectTopics, setAutoTags } from "../topics";
import { isTopic } from "../topic-list";
import { isGoogleNewsSource, searchGoogleNews } from "./google-news";
import { discoverFeeds, looksLikeFeed, parseFeed, scrapeArticleLinks, type FoundArticle } from "./parse";

const FEED_BYTES = 3 * 1024 * 1024;
const PAGE_ACCEPT = /(html|xml|rss|atom)/i;

export type ImportMode = "flux" | "page" | "google_news";

const MODE_LABEL: Record<ImportMode, string> = { flux: "le flux RSS/Atom", page: "la page d'accueil", google_news: "Google News" };

export interface ImportResult {
  ok: boolean;
  mode?: ImportMode;
  found: number;
  created: number;
  skipped: number;
  message: string;
}

const FAILURES: Record<PreviewFailure, string> = {
  invalid: "adresse invalide",
  blocked: "adresse non publique",
  not_found: "site ou page introuvable",
  server_error: "le site renvoie une erreur",
  restricted: "le site refuse l'accès aux robots",
  timeout: "le site ne répond pas (délai dépassé)",
  unreachable: "connexion impossible",
};

/** Feed categories that mark something other than a news article. */
const NOT_NEWS = /^(newsletters?|podcasts?|sponsored|sponsoris[ée]e?s?|publi-?reportages?|publireportage|partner content|tc daily)$/i;

/** Decodes leftover HTML entities (some sites encode twice) and drops leading emoji. */
export function cleanTitle(raw: string): string {
  return decodeEntities(decodeEntities(raw))
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0f\s]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
    // "Title | Site name : tagline" → "Title" (when what's left is still a real title).
    .replace(/^(.{15,}?)\s+\|\s+[^|]*$/, "$1");
}

/** Drops tracking parameters and fragments so the same article isn't imported twice. */
export function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|xtor|at_)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

/** Runs `fn` over `items`, 4 at a time, keeping the order. */
async function inBatches<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += 4) out.push(...(await Promise.all(items.slice(i, i + 4).map(fn))));
  return out;
}

/**
 * Advanced scraper on each article page: title, summary, keywords, language,
 * reading time and a measured cover. A small or missing picture is dropped (the
 * site then shows the topic's cover); the source's own image is kept only if large.
 */
export function analyzeAll(articles: FoundArticle[]): Promise<FoundArticle[]> {
  return inBatches(articles, async (a) => {
    if (a.analyzed) return a;
    const result = await analyzeArticle(a.url);
    if (!result.ok) return { ...a, image: (await worthKeeping(a.image)) ? a.image : null };
    const { preview, cover, summary } = result.article;
    const described = preview.description ? stripLeadingTitle(preview.description, a.title) : null;
    return {
      ...a,
      title: a.title || preview.title || a.url,
      url: result.article.url,
      summary: a.summary && a.summary.length >= 100 ? a.summary : described && described.length >= 100 ? described : summary ?? described ?? a.summary,
      image: cover?.url ?? ((await worthKeeping(a.image)) ? a.image : null),
      keywords: [...new Set([...preview.keywords, ...a.keywords])],
      language: preview.lang ?? a.language,
      readingMinutes: result.article.readingMinutes,
      analyzed: true,
      text: result.article.text.slice(0, 600),
    };
  });
}

/** Finds articles on a source: its feed if it has one, else links scraped from the page. */
export async function findArticles(sourceUrl: string, limit: number): Promise<{ mode: ImportMode; language: string | null; articles: FoundArticle[] } | { error: string }> {
  if (isGoogleNewsSource(sourceUrl)) {
    const news = await searchGoogleNews(sourceUrl);
    return "error" in news ? news : { mode: "google_news", ...news };
  }

  const page = await fetchPublic(sourceUrl, {
    accept: PAGE_ACCEPT,
    maxBytes: FEED_BYTES,
    acceptHeader: "application/rss+xml,application/atom+xml,application/xml;q=0.9,text/html;q=0.8,*/*;q=0.5",
  });
  if (!page.ok) return { error: FAILURES[page.reason] + (page.status ? ` (${page.status})` : "") };

  if (looksLikeFeed(page.body)) {
    const feed = parseFeed(page.body, page.url);
    return { mode: "flux", language: feed.language, articles: feed.articles };
  }

  for (const feedUrl of discoverFeeds(page.body, page.url).slice(0, 3)) {
    const feed = await fetchPublic(feedUrl, { accept: PAGE_ACCEPT, maxBytes: FEED_BYTES, acceptHeader: "application/rss+xml,application/atom+xml,application/xml" });
    if (feed.ok && looksLikeFeed(feed.body)) {
      const parsed = parseFeed(feed.body, feed.url);
      if (parsed.articles.length > 0) return { mode: "flux", language: parsed.language, articles: parsed.articles };
    }
  }

  // No usable feed: read the listing page, then analyse each article page.
  const links = scrapeArticleLinks(page.body, page.url, limit);
  const articles = await analyzeAll(links.map((link) => ({ title: link.title, url: link.url, publishedAt: null, summary: null, image: null, keywords: [] })));
  return { mode: "page", language: null, articles };
}

/** The account imported stories are posted under, one per source (e.g. "developpez_com"). */
async function sourceAuthor(source: { id: number; name: string }): Promise<number> {
  const email = `import-${source.id}@techcg.invalid`;
  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing) return existing.id;

  const base = slugify(source.name).replace(/-/g, "_").slice(0, 20) || `source_${source.id}`;
  let username = base;
  for (let n = 2; await prisma.user.findUnique({ where: { username }, select: { id: true } }); n++) username = `${base}_${n}`;
  const user = await prisma.user.create({
    data: { username, email, about: `Compte automatique : articles importés depuis ${source.name}.` },
    select: { id: true },
  });
  return user.id;
}

/** Imports new articles from one source and records the outcome on it. */
export async function runImport(sourceId: number): Promise<ImportResult> {
  const source = await prisma.importSource.findUnique({ where: { id: sourceId } });
  if (!source) return { ok: false, found: 0, created: 0, skipped: 0, message: "Source introuvable." };

  let result: ImportResult;
  try {
    result = await importFrom(source);
  } catch (err) {
    console.error(`[import] source ${sourceId} failed:`, err);
    result = { ok: false, found: 0, created: 0, skipped: 0, message: "Erreur inattendue pendant l'importation." };
  }

  await prisma.importSource.update({ where: { id: sourceId }, data: { lastRunAt: new Date(), lastResult: result.message } });
  return result;
}


async function importFrom(source: { id: number; name: string; url: string; maxItems: number; categoryId: number | null; topic: string | null }): Promise<ImportResult> {
  const limit = Math.min(Math.max(source.maxItems, 1), 100);
  const found = await findArticles(source.url, limit);
  if ("error" in found) return { ok: false, found: 0, created: 0, skipped: 0, message: `Échec : ${found.error}.` };

  // Newest first, unique by canonical URL; no newsletters, podcasts or sponsored posts.
  const seen = new Set<string>();
  const articles = found.articles
    .map((a) => ({ ...a, url: canonicalUrl(a.url), title: cleanTitle(a.title) }))
    .filter((a) => a.title && !a.keywords.some((k) => NOT_NEWS.test(k.trim())))
    .filter((a) => !seen.has(a.url) && seen.add(a.url))
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, limit);

  const existing = await prisma.item.findMany({
    where: { url: { in: articles.flatMap((a) => [a.url, a.url.replace(/\/$/, ""), `${a.url.replace(/\/$/, "")}/`]) } },
    select: { url: true },
  });
  const known = new Set(existing.map((e) => e.url?.replace(/\/$/, "")));
  const fresh = articles.filter((a) => !known.has(a.url.replace(/\/$/, "")));

  if (fresh.length === 0) {
    return { ok: true, mode: found.mode, found: articles.length, created: 0, skipped: articles.length, message: `${articles.length} article(s) trouvé(s) via ${MODE_LABEL[found.mode]}, aucun nouveau.` };
  }

  const authorId = await sourceAuthor(source);
  const now = Date.now();
  let created = 0;
  // Every new article page is analysed (feeds give little text and often small or no pictures).
  const toCreate = await analyzeAll(fresh);

  for (const article of toCreate) {
    const language = article.language ?? found.language ?? null;
    let excerpt = article.summary;
    let excerptLang: string | null = excerpt ? language : null;
    if (excerpt && excerptLang !== "fr") {
      const translation = await translateToFrench(excerpt, excerptLang);
      if (translation) {
        excerpt = translation.text;
        excerptLang = "fr";
      }
    }

    const title = await frenchTitle(article.title, language);
    // Topics from the original wording too: keyword lists are often in the source language.
    const topics = detectTopics({
      title: `${title.title} . ${title.originalTitle ?? ""}`,
      excerpt: `${excerpt ?? ""} . ${article.summary ?? ""} . ${article.text ?? ""}`,
      keywords: article.keywords,
      url: article.url,
    });
    // No meta topic found: use the source's own (e.g. a Google News search on "startups Congo").
    if (source.topic && isTopic(source.topic) && !topics.some(isTopic)) topics.push(source.topic);

    // Never date an article in the future; feeds sometimes do.
    const createdAt = article.publishedAt && article.publishedAt.getTime() <= now ? article.publishedAt : new Date(now);
    const story = await prisma.item.create({
      data: {
        type: "story",
        title: title.title,
        titleLang: title.titleLang,
        originalTitle: title.originalTitle,
        keywords: article.keywords,
        url: article.url,
        excerpt,
        excerptLang: excerpt ? excerptLang ?? "und" : null,
        imageUrl: article.image,
        readingMinutes: article.readingMinutes ?? null,
        analyzedAt: article.analyzed ? new Date(now) : null,
        // Missing image or excerpt: the preview job fills them in later.
        // Analysed pages are done; otherwise the preview job tries again later.
        previewAt: article.analyzed || (excerpt && article.image) ? new Date(now) : null,
        authorId,
        points: 1,
        rankScore: calculateRankScore(1, createdAt),
        createdAt,
        categoryId: source.categoryId,
        importSourceId: source.id,
      },
      select: { id: true },
    });
    await prisma.item.update({ where: { id: story.id }, data: { path: String(story.id).padStart(6, "0") } });
    await setAutoTags(story.id, topics);
    created++;
  }

  const skipped = articles.length - created;
  return {
    ok: true,
    mode: found.mode,
    found: articles.length,
    created,
    skipped,
    message: `${created} article(s) importé(s), ${skipped} déjà présent(s) — via ${MODE_LABEL[found.mode]}.`,
  };
}
