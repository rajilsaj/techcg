import { prisma } from "../db";
import { decodeEntities, fetchPublic, type FetchResult, type PreviewFailure, type RequestOptions } from "../link-preview";
import { analyzeArticle, type RenderPage } from "../scraper/article";
import { worthKeeping } from "../scraper/image-size";
import { stripLeadingTitle } from "../excerpt";
import { calculateRankScore } from "../ranking";
import { slugify } from "../taxonomy";
import { frenchTitle, translateToFrench } from "../translate";
import { detectTopics, setAutoTags } from "../topics";
import { isTopic } from "../topic-list";
import { isGoogleNewsSource, searchGoogleNews } from "./google-news";
import { discoverFeeds, looksLikeFeed, parseFeed, scrapeArticleLinks, type FoundArticle } from "./parse";
import { robotsAllowed } from "./robots";
import { TITLE_WINDOW_DAYS, sameHeadline, urlKey } from "../duplicates";
import { openRenderer, type Renderer } from "./browser";

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
  /** Validators of the source address's response, kept for the next run (undefined: keep the stored ones). */
  validators?: { etag: string | null; lastModified: string | null };
}

/** A source counts as failing (alert in the admin) after this many failed runs in a row. */
export const FAILING_AFTER = 3;

const FAILURES: Record<PreviewFailure, string> = {
  invalid: "adresse invalide",
  blocked: "adresse non publique",
  not_found: "site ou page introuvable",
  server_error: "le site renvoie une erreur",
  restricted: "le site refuse l'accès aux robots — passez par Google News (voir le guide)",
  timeout: "le site ne répond pas (délai dépassé)",
  unreachable: "connexion impossible",
};

/** Feed categories that mark something other than a news article. */
const NOT_NEWS = /^(newsletters?|podcasts?|sponsored|sponsoris[ée]e?s?|publi-?reportages?|publireportage|partner content|tc daily|bons? plans?|deals?|promos?|soldes|black friday|codes? promo)$/i;
/** Shopping deals (« bons plans ») by their address, for feeds that don't tag them. */
const DEAL_PATH = /\/(bons?-plans?|deals?|promos?|soldes|codes?-promo)(\/|$)/i;

export function isDeal(url: string): boolean {
  try {
    return DEAL_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** Decodes leftover HTML entities (some sites encode twice) and drops leading emoji. */
export function cleanTitle(raw: string): string {
  return decodeEntities(decodeEntities(raw))
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0f\s]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
    // "Title | Site name : tagline" → "Title" (when what's left is still a real title).
    .replace(/^(.{15,}?)\s+\|\s+[^|]*$/, "$1")
    // "validation sous peu…" → "Validation sous peu…"
    // (only when the whole first word is lowercase: "iPhone", "eBay" stay as they are).
    .replace(/^\p{Ll}(?=[\p{Ll}'’-]*(\s|$))/u, (c) => c.toUpperCase());
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

/**
 * Drops keywords most articles of a batch share: a site's SEO boilerplate
 * ("streaming RTNC TV" on every page) or word-frequency lists ("des, les, pour"),
 * which say nothing about the article and would tag it wrongly.
 */
export function withoutSiteWideKeywords(articles: FoundArticle[]): FoundArticle[] {
  if (articles.length < 3) return articles;
  const counts = new Map<string, number>();
  for (const a of articles) for (const k of new Set(a.keywords.map((k) => k.toLowerCase()))) counts.set(k, (counts.get(k) ?? 0) + 1);
  const threshold = Math.max(3, Math.ceil(articles.length * 0.6));
  const common = new Set([...counts].filter(([, n]) => n >= threshold).map(([k]) => k));
  return common.size === 0 ? articles : articles.map((a) => ({ ...a, keywords: a.keywords.filter((k) => !common.has(k.toLowerCase())) }));
}

/** Runs `fn` over `items`, `size` at a time, keeping the order. */
async function inBatches<T, R>(items: T[], fn: (item: T) => Promise<R>, size = 4): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

/* ---------- Reliable, polite fetching ---------- */

/** Waits before the 2nd and 3rd attempts when a site times out or errors. */
const RETRY_DELAYS_MS = [2_000, 5_000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const retryable = (res: FetchResult) =>
  !res.ok && (res.reason === "timeout" || res.reason === "unreachable" || res.reason === "server_error" || res.status === 429);

/** fetchPublic, tried again twice (after 2 s, then 5 s) on a timeout, a lost connection, a 5xx or a 429. */
export async function fetchWithRetry(url: string | URL, options: RequestOptions, delays = RETRY_DELAYS_MS): Promise<FetchResult> {
  let res = await fetchPublic(url, options);
  for (const delay of delays) {
    if (!retryable(res)) break;
    await sleep(delay);
    res = await fetchPublic(url, options);
  }
  return res;
}

/** The browser's render, tried once more on a failure that may be passing (slow site). */
function renderWithRetry(renderer: Renderer): RenderPage {
  return async (url) => {
    const first = await renderer.render(url);
    if (first.ok || /refuse|introuvable|non publique/.test(first.error)) return first;
    await sleep(RETRY_DELAYS_MS[0]);
    return renderer.render(url);
  };
}

const ROBOTS_REFUSED = "le site interdit l'accès à notre robot (robots.txt)";

/**
 * Advanced scraper on each article page: title, summary, keywords, language,
 * reading time and a measured cover. A small or missing picture is dropped (the
 * site then shows the topic's cover); the source's own image is kept only if large.
 */
export function analyzeAll(articles: FoundArticle[], render?: RenderPage): Promise<FoundArticle[]> {
  return inBatches(articles, async (a) => {
    if (a.analyzed) return a;
    // Pages robots.txt keeps us out of: only what the feed said about them.
    const result = (await robotsAllowed(a.url)) ? await analyzeArticle(a.url, render) : ({ ok: false } as const);
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
  }, render ? 1 : 4); // The browser opens one page at a time.
}

export interface FindOptions {
  /** « Navigateur » sources: the listing and article pages are rendered by this browser. */
  renderer?: Renderer;
  /** Validators from the last run: an unchanged source answers 304 and nothing is downloaded. */
  etag?: string | null;
  lastModified?: string | null;
}

export type FindResult =
  | { mode: ImportMode; language: string | null; articles: FoundArticle[]; validators?: ImportResult["validators"] }
  | { notModified: true }
  | { error: string };

/** Finds articles on a source: its feed if it has one, else links scraped from the page. */
export async function findArticles(sourceUrl: string, limit: number, options: FindOptions = {}): Promise<FindResult> {
  if (isGoogleNewsSource(sourceUrl)) {
    const news = await searchGoogleNews(sourceUrl);
    return "error" in news ? news : { mode: "google_news", ...news };
  }
  if (!(await robotsAllowed(sourceUrl))) return { error: ROBOTS_REFUSED };

  const render = options.renderer ? renderWithRetry(options.renderer) : undefined;
  let page: { url: URL; body: string };
  let validators: ImportResult["validators"];
  if (render) {
    const rendered = await render(sourceUrl);
    if (!rendered.ok) return { error: rendered.error };
    page = rendered;
  } else {
    const fetched = await fetchWithRetry(sourceUrl, {
      accept: PAGE_ACCEPT,
      maxBytes: FEED_BYTES,
      acceptHeader: "application/rss+xml,application/atom+xml,application/xml;q=0.9,text/html;q=0.8,*/*;q=0.5",
      ifNoneMatch: options.etag,
      ifModifiedSince: options.lastModified,
    });
    if (!fetched.ok) return { error: FAILURES[fetched.reason] + (fetched.status ? ` (${fetched.status})` : "") };
    if (fetched.status === 304) return { notModified: true };
    page = fetched;
    validators = { etag: fetched.etag ?? null, lastModified: fetched.lastModified ?? null };
  }

  if (!render && looksLikeFeed(page.body)) {
    const feed = parseFeed(page.body, page.url);
    return { mode: "flux", language: feed.language, articles: feed.articles, validators };
  }

  for (const feedUrl of discoverFeeds(page.body, page.url).slice(0, 3)) {
    if (!(await robotsAllowed(feedUrl))) continue;
    const feed = await fetchWithRetry(feedUrl, { accept: PAGE_ACCEPT, maxBytes: FEED_BYTES, acceptHeader: "application/rss+xml,application/atom+xml,application/xml" }, [2_000]);
    if (feed.ok && looksLikeFeed(feed.body)) {
      const parsed = parseFeed(feed.body, feed.url);
      if (parsed.articles.length > 0) return { mode: "flux", language: parsed.language, articles: parsed.articles, validators };
    }
  }

  // No usable feed: read the listing page, then analyse each article page.
  const links = scrapeArticleLinks(page.body, page.url, limit);
  const articles = await analyzeAll(links.map((link) => ({ title: link.title, url: link.url, publishedAt: null, summary: null, image: null, keywords: [] })), render);
  return { mode: "page", language: null, articles, validators };
}

/**
 * Articles of a batch already on the site: same address (at any time, trashed ones
 * included, so a removed article never comes back) or, within TITLE_WINDOW_DAYS,
 * the same headline (another source, or the site posting it twice).
 */
async function alreadyPublished(articles: FoundArticle[]): Promise<{ sameAddress: Set<string>; sameTitle: Set<string> }> {
  const keys = articles.map((a) => urlKey(a.url)).filter((k): k is string => !!k);
  const [byAddress, recent] = await Promise.all([
    prisma.item.findMany({ where: { OR: [{ urlKey: { in: keys } }, { url: { in: articles.map((a) => a.url) } }] }, select: { url: true, urlKey: true } }),
    prisma.item.findMany({
      where: { type: { in: ["story", "show", "job", "ask"] }, createdAt: { gte: new Date(Date.now() - TITLE_WINDOW_DAYS * 24 * 60 * 60 * 1000) } },
      select: { title: true, originalTitle: true },
    }),
  ]);
  const knownKeys = new Set(byAddress.flatMap((i) => [i.urlKey, urlKey(i.url)]).filter(Boolean));
  const sameAddress = new Set(articles.filter((a) => knownKeys.has(urlKey(a.url))).map((a) => a.url));
  const sameTitle = new Set(
    articles
      .filter((a) => !sameAddress.has(a.url) && recent.some((r) => sameHeadline(r.originalTitle, a.title) || sameHeadline(r.title, a.title)))
      .map((a) => a.url)
  );
  return { sameAddress, sameTitle };
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

  // One run per source at a time (« Importer maintenant » during an automatic run, two server instances…).
  // A claim older than 10 minutes is a run that crashed: it can be taken over.
  const claimed = await prisma.importSource.updateMany({
    where: { id: sourceId, OR: [{ importingSince: null }, { importingSince: { lt: new Date(Date.now() - 10 * 60_000) } }] },
    data: { importingSince: new Date() },
  });
  if (claimed.count === 0) return { ok: true, found: 0, created: 0, skipped: 0, message: "Importation déjà en cours pour cette source." };

  let result: ImportResult;
  let renderer: Renderer | undefined;
  try {
    if (source.render && !isGoogleNewsSource(source.url)) renderer = await openRenderer();
    result = await importFrom(source, renderer);
  } catch (err) {
    console.error(`[import] source ${sourceId} failed:`, err);
    const browser = source.render && !renderer;
    result = { ok: false, found: 0, created: 0, skipped: 0, message: browser ? "Échec : le navigateur n'a pas pu démarrer." : "Erreur inattendue pendant l'importation." };
  } finally {
    await renderer?.close();
  }

  // Failed runs in a row: after FAILING_AFTER the admin shows an alert. A success resets the count.
  await prisma.importSource.update({
    where: { id: sourceId },
    data: {
      lastRunAt: new Date(),
      lastResult: result.message,
      importingSince: null,
      ...(result.ok ? { failCount: 0, failingSince: null } : { failCount: { increment: 1 }, failingSince: source.failingSince ?? new Date() }),
      ...(result.ok && result.validators ? result.validators : {}),
    },
  });
  return result;
}


async function importFrom(source: {
  id: number;
  name: string;
  url: string;
  maxItems: number;
  categoryId: number | null;
  topic: string | null;
  strict: boolean;
  etag: string | null;
  lastModified: string | null;
}, renderer?: Renderer): Promise<ImportResult> {
  const limit = Math.min(Math.max(source.maxItems, 1), 100);
  const found = await findArticles(source.url, limit, { renderer, etag: source.etag, lastModified: source.lastModified });
  if ("error" in found) return { ok: false, found: 0, created: 0, skipped: 0, message: `Échec : ${found.error}.` };
  if ("notModified" in found) {
    return { ok: true, found: 0, created: 0, skipped: 0, message: "Aucun changement depuis la dernière lecture (le site l'indique), rien à télécharger." };
  }
  const render = renderer ? renderWithRetry(renderer) : undefined;
  const { validators } = found;

  // Newest first, one per article (same address or same headline); no newsletters, podcasts or sponsored posts.
  const seenKeys = new Set<string>();
  const unique: FoundArticle[] = [];
  const listed = found.articles
    .map((a) => ({ ...a, url: canonicalUrl(a.url), title: cleanTitle(a.title) }))
    .filter((a) => a.title && !a.keywords.some((k) => NOT_NEWS.test(k.trim())) && !isDeal(a.url))
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  for (const a of listed) {
    const key = urlKey(a.url) ?? a.url;
    if (seenKeys.has(key) || unique.some((u) => sameHeadline(u.title, a.title))) continue;
    seenKeys.add(key);
    unique.push(a);
  }
  const articles = unique.slice(0, limit);

  const { sameAddress, sameTitle } = await alreadyPublished(articles);
  const fresh = articles.filter((a) => !sameAddress.has(a.url) && !sameTitle.has(a.url));

  if (fresh.length === 0) {
    return { ok: true, mode: found.mode, found: articles.length, created: 0, skipped: articles.length, validators, message: `${articles.length} article(s) trouvé(s) via ${MODE_LABEL[found.mode]}, aucun nouveau.` };
  }

  // « Filtrer » (strict sources): articles whose title, summary and keywords show no
  // startup, entrepreneur or tech angle are dropped before their page is even read.
  const candidates = source.strict
    ? withoutSiteWideKeywords(fresh).filter((a) => detectTopics({ title: a.title, excerpt: a.summary, keywords: a.keywords, url: a.url }).some(isTopic))
    : fresh;
  let offTopic = fresh.length - candidates.length;

  const authorId = await sourceAuthor(source);
  let lateDuplicates = 0;
  const now = Date.now();
  let created = 0;
  // Every new article page is analysed (feeds give little text and often small or no pictures).
  const toCreate = withoutSiteWideKeywords(await analyzeAll(candidates, render));

  for (const article of toCreate) {
    // Another import may have added it while this one was reading pages (the address may also have changed on redirect).
    const key = urlKey(article.url);
    const late = await prisma.item.findFirst({ where: { OR: [...(key ? [{ urlKey: key }] : []), { url: article.url }] }, select: { id: true } });
    if (late) {
      lateDuplicates++;
      continue;
    }

    // Strict sources: the analysed page must confirm the topic (title, or two different terms), checked before translating.
    if (
      source.strict &&
      !detectTopics(
        { title: article.title, excerpt: `${article.summary ?? ""} . ${article.text ?? ""}`, keywords: article.keywords, url: article.url },
        { strict: true }
      ).some(isTopic)
    ) {
      offTopic++;
      continue;
    }

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
    const topics = detectTopics(
      {
        title: `${title.title} . ${title.originalTitle ?? ""}`,
        excerpt: `${excerpt ?? ""} . ${article.summary ?? ""} . ${article.text ?? ""}`,
        keywords: article.keywords,
        url: article.url,
      },
      { strict: source.strict }
    );
    // No meta topic found: use the source's own (e.g. a Google News search on "startups Congo").
    // Événements stays for Congo and Africa only, even as a fallback.
    const african = topics.includes("congo") || topics.includes("afrique");
    if (source.topic && isTopic(source.topic) && !topics.some(isTopic) && (source.topic !== "evenements" || african)) topics.push(source.topic);

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
        urlKey: key,
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
  const duplicates = sameTitle.size + lateDuplicates;
  const already = skipped - offTopic - duplicates;
  return {
    ok: true,
    mode: found.mode,
    found: articles.length,
    created,
    skipped,
    validators,
    message: `${created} article(s) importé(s), ${already} déjà présent(s)${duplicates ? `, ${duplicates} doublon(s) écarté(s)` : ""}${offTopic ? `, ${offTopic} hors sujet écarté(s)` : ""} — via ${MODE_LABEL[found.mode]}.`,
  };
}
