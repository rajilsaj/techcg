import { prisma } from "./db";
import { getLinkPreview } from "./link-preview";
import { translateToFrench } from "./translate";
import { stripLeadingTitle } from "./excerpt";

/** How long to wait before retrying a story whose excerpt couldn't be translated. */
const TRANSLATION_RETRY_MS = 60 * 60 * 1000;
/** How long to wait before retrying a story whose page couldn't be read at all. */
const FETCH_RETRY_MS = 6 * 60 * 60 * 1000;

interface PreviewState {
  url: string | null;
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
  if (!item.excerpt && !item.imageUrl) return age > FETCH_RETRY_MS;
  return false;
}

const inFlight = new Set<number>();

/**
 * Fetches the story's page, keeps its image and excerpt, and translates the
 * excerpt into French. Existing data is never wiped by a later failed attempt.
 */
export async function enrichStory(itemId: number): Promise<void> {
  if (inFlight.has(itemId)) return;
  inFlight.add(itemId);
  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { url: true, title: true, excerpt: true, excerptLang: true, imageUrl: true, previewAt: true },
    });
    if (!item?.url) return;

    let excerpt = item.excerpt;
    let excerptLang = item.excerptLang;
    let imageUrl = item.imageUrl;

    // Only the translation failed last time: no need to fetch the page again.
    const translationOnly = item.previewAt && item.excerpt && item.excerptLang !== "fr";

    if (!translationOnly) {
      const result = await getLinkPreview(item.url);
      if (result.ok) {
        imageUrl = result.preview.image ?? imageUrl;
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

    await prisma.item.update({
      where: { id: itemId },
      data: { excerpt, excerptLang, imageUrl, previewAt: new Date() },
    });
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
