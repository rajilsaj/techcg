import { prisma } from "./db";
import { getLinkPreview } from "./link-preview";
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

/**
 * Fetches the story's page, keeps its image, excerpt and keywords, translates the
 * title and excerpt into French and adds the topic tags. Existing data is never wiped by a later failed attempt.
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

    // Already fetched once with some result: only a translation is pending, no need to fetch again.
    const translationOnly = item.previewAt && (item.excerpt || item.imageUrl);

    if (!translationOnly) {
      const result = await getLinkPreview(item.url);
      if (result.ok) {
        imageUrl = result.preview.image ?? imageUrl;
        pageLang = result.preview.lang;
        if (result.preview.keywords.length > 0) keywords = result.preview.keywords;
        if (result.preview.description) {
          excerpt = stripLeadingTitle(result.preview.description, item.title);
          excerptLang = result.preview.lang ?? null;
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
      data: { excerpt, excerptLang, imageUrl, keywords, ...title, previewAt: new Date() },
    });
    // An admin's choice in the meta picker wins over detection.
    if (!item.metaManual) {
      await setAutoTags(
        itemId,
        detectTopics({ title: `${title.title ?? ""} . ${title.originalTitle ?? ""}`, excerpt, keywords, url: item.url })
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
