import { prisma } from "./db";
import { analyzeArticle } from "./scraper/article";
import { worthKeeping } from "./scraper/image-size";
import { frenchTitle, translateToFrench } from "./translate";
import { detectTopics, setAutoTags } from "./topics";
import { stripLeadingTitle } from "./excerpt";

/** How long to wait before retrying a story whose excerpt couldn't be translated. */
const TRANSLATION_RETRY_MS = 60 * 60 * 1000;
/** How long to wait before retrying a story whose page couldn't be read at all. */
const FETCH_RETRY_MS = 6 * 60 * 60 * 1000;

interface PreviewState {
  url: string | null;
  title?: string | null;
  titleLang?: string | null;
  excerpt: string | null;
  excerptLang: string | null;
  imageUrl: string | null;
  previewAt: Date | null;
}

/** Whether a story still needs its preview fetched or its excerpt translated. */
export function needsEnrichment(item: PreviewState, now = Date.now()): boolean {
  if (!item.url) return false;
  if (!item.previewAt) return true;
  const age = now - item.previewAt.getTime();
  if (item.excerpt && item.excerptLang !== "fr") return age > TRANSLATION_RETRY_MS;
  if (item.title && item.titleLang !== undefined && item.titleLang !== "fr") return age > TRANSLATION_RETRY_MS;
  if (!item.excerpt && !item.imageUrl) return age > FETCH_RETRY_MS;
  return false;
}

const inFlight = new Set<number>();

/** An existing image is kept unless it was measured as too small for a cover. */
async function keepIfBig(url: string | null): Promise<string | null> {
  return (await worthKeeping(url)) ? url : null;
}

/**
 * Analyses the story's page (advanced scraper): keeps a measured, large cover
 * (else none, and the site shows the topic's cover), the excerpt, keywords and
 * reading time; translates the title and excerpt into French and adds the topic
 * tags. Existing data is never wiped by a later failed attempt.
 */
export async function enrichStory(itemId: number): Promise<void> {
  if (inFlight.has(itemId)) return;
  inFlight.add(itemId);
  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { url: true, title: true, titleLang: true, originalTitle: true, keywords: true, excerpt: true, excerptLang: true, imageUrl: true, previewAt: true, metaManual: true },
    });
    if (!item?.url) return;

    let excerpt = item.excerpt;
    let excerptLang = item.excerptLang;
    let imageUrl = item.imageUrl;
    let keywords = item.keywords;
    let pageLang: string | null = null;
    let readingMinutes: number | null | undefined;
    let analyzedAt: Date | undefined;
    let bodyText = "";

    // Already fetched once with some result: only a translation is pending, no need to fetch again.
    const translationOnly = item.previewAt && (item.excerpt || item.imageUrl);

    if (!translationOnly) {
      const result = await analyzeArticle(item.url);
      if (result.ok) {
        const { preview, cover, summary } = result.article;
        imageUrl = cover?.url ?? (await keepIfBig(imageUrl));
        pageLang = preview.lang;
        readingMinutes = result.article.readingMinutes;
        bodyText = result.article.text;
        analyzedAt = new Date();
        if (preview.keywords.length > 0) keywords = preview.keywords;
        // The publisher's description, unless it is short or just repeats the title: then the article's opening.
        const described = preview.description ? stripLeadingTitle(preview.description, item.title) : null;
        const best = described && described.length >= 100 ? described : summary ?? described;
        if (best) {
          excerpt = best;
          excerptLang = preview.lang ?? null;
        }
      }
    }

    if (excerpt && excerptLang !== "fr") {
      const translation = await translateToFrench(excerpt, excerptLang);
      if (translation) {
        excerpt = translation.text;
        excerptLang = "fr";
      } else {
        excerptLang = excerptLang ?? "und"; // unknown; retried later
      }
    }

    // The title: members may type it in any language; translate unless it's French.
    let title = { title: item.title, titleLang: item.titleLang, originalTitle: item.originalTitle };
    if (item.title && item.titleLang !== "fr") {
      // A title that matches a French page is French; otherwise let the translator detect it.
      title = await frenchTitle(item.title, pageLang === "fr" ? null : item.titleLang && item.titleLang !== "und" ? item.titleLang : null);
    }

    await prisma.item.update({
      where: { id: itemId },
      data: { excerpt, excerptLang, imageUrl, keywords, ...title, previewAt: new Date(), readingMinutes, analyzedAt },
    });
    // An admin's choice in the meta picker wins over detection.
    if (!item.metaManual) {
      await setAutoTags(
        itemId,
        detectTopics({ title: `${title.title ?? ""} . ${title.originalTitle ?? ""}`, excerpt: `${excerpt ?? ""} . ${bodyText.slice(0, 600)}`, keywords, url: item.url })
      );
    }
  } catch (err) {
    console.error(`[enrich] story ${itemId} failed:`, err);
  } finally {
    inFlight.delete(itemId);
  }
}

/** Enriches stories one after another, to stay gentle on sites and the translation quota. */
export async function enrichStories(itemIds: number[]): Promise<void> {
  for (const id of itemIds) await enrichStory(id);
}
