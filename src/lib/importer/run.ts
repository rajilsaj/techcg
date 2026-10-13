import { prisma } from "../db";
import { fetchPublic, getLinkPreview, type PreviewFailure } from "../link-preview";
import { calculateRankScore } from "../ranking";
import { slugify } from "../taxonomy";
import { frenchTitle, translateToFrench } from "../translate";
import { addTopicTags, detectTopics } from "../topics";
import { discoverFeeds, looksLikeFeed, parseFeed, scrapeArticleLinks, type FoundArticle } from "./parse";

const FEED_BYTES = 3 * 1024 * 1024;
const PAGE_ACCEPT = /(html|xml|rss|atom)/i;

export interface ImportResult {
  ok: boolean;
  mode?: "flux" | "page";
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

/** Finds articles on a source: its feed if it has one, else links scraped from the page. */
export async function findArticles(sourceUrl: string, limit: number): Promise<{ mode: "flux" | "page"; language: string | null; articles: FoundArticle[] } | { error: string }> {
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

  // No usable feed: read the listing page, then each article page for its metadata.
  const links = scrapeArticleLinks(page.body, page.url, limit);
  const articles: FoundArticle[] = [];
  for (const link of links) {
    const preview = await getLinkPreview(link.url);
    articles.push({
      title: preview.ok && preview.preview.title ? preview.preview.title : link.title,
      url: preview.ok ? preview.preview.url : link.url,
      publishedAt: null,
      summary: preview.ok ? preview.preview.description : null,
      image: preview.ok ? preview.preview.image : null,
      keywords: preview.ok ? preview.preview.keywords : [],
      language: preview.ok ? preview.preview.lang : null,
    });
  }
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

async function importFrom(source: { id: number; name: string; url: string; maxItems: number; categoryId: number | null }): Promise<ImportResult> {
  const limit = Math.min(Math.max(source.maxItems, 1), 100);
  const found = await findArticles(source.url, limit);
  if ("error" in found) return { ok: false, found: 0, created: 0, skipped: 0, message: `Échec : ${found.error}.` };

  // Newest first, unique by canonical URL.
  const seen = new Set<string>();
  const articles = found.articles
    .map((a) => ({ ...a, url: canonicalUrl(a.url) }))
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
    const mode = found.mode === "flux" ? "flux" : "page";
    return { ok: true, mode: found.mode, found: articles.length, created: 0, skipped: articles.length, message: `${articles.length} article(s) trouvé(s) (${mode}), aucun nouveau.` };
  }

  const authorId = await sourceAuthor(source);
  const now = Date.now();
  let created = 0;

  for (const article of fresh) {
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
    const topics = detectTopics({ title: `${title.title} . ${title.originalTitle ?? ""}`, excerpt: `${excerpt ?? ""} . ${article.summary ?? ""}`, keywords: article.keywords, url: article.url });

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
        // Missing image or excerpt: the preview job fills them in later.
        previewAt: excerpt && article.image ? new Date(now) : null,
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
    await addTopicTags(story.id, topics);
    created++;
  }

  const skipped = articles.length - created;
  return {
    ok: true,
    mode: found.mode,
    found: articles.length,
    created,
    skipped,
    message: `${created} article(s) importé(s), ${skipped} déjà présent(s) — via ${found.mode === "flux" ? "le flux RSS/Atom" : "la page d'accueil"}.`,
  };
}
