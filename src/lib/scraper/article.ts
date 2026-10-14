import {
  NOT_CONTENT_IMAGE,
  absoluteHttpUrl,
  attributes,
  contentArea,
  fetchPublic,
  parseMetadata,
  plainText,
  type LinkPreview,
  type PreviewFailure,
} from "../link-preview";
import { isBigCover, probeImage } from "./image-size";

/*
 * The "advanced scraper": reads an article page, keeps its metadata (title,
 * description, keywords, language), extracts the main text (for a better
 * summary, the reading time and topic detection) and picks a real cover:
 * every candidate image is measured, and only a large landscape-ish picture
 * is kept. No good picture → no image, and the site shows the topic's cover.
 */

export interface ImageCandidate {
  url: string;
  /** Size declared by the page (og:image:width, width="", srcset "1200w"…), when given. */
  width?: number;
  height?: number;
  source: "og" | "twitter" | "jsonld" | "content";
}

export interface ScrapedArticle {
  url: string;
  preview: LinkPreview;
  /** The article's first paragraphs, up to about 400 characters. */
  summary: string | null;
  /** Main text, for topic detection (first ~3,000 characters). */
  text: string;
  wordCount: number;
  readingMinutes: number | null;
  /** A measured, large cover picture, or null. */
  cover: { url: string; width: number; height: number } | null;
  /** Why there is no cover: the page had none, or none was big enough / readable. */
  coverCheck: "ok" | "none" | "too_small";
}

const HTML_BYTES = 1536 * 1024;
const MAX_PROBES = 4;

/** Prose paragraphs of the article body, skipping bylines, captions, cookie and share notices. */
export function articleParagraphs(html: string): string[] {
  const fromArticle = proseIn(contentArea(html));
  // Some sites wrap only a teaser in <article>: then read the whole page (minus menus and footer).
  if (words(fromArticle) >= 150) return fromArticle;
  const fromPage = proseIn(html.replace(/<(script|style|noscript|svg|template|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " "));
  return words(fromPage) > words(fromArticle) ? fromPage : fromArticle;
}

const words = (paragraphs: string[]) => paragraphs.reduce((n, p) => n + p.split(/\s+/).length, 0);

function proseIn(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = plainText(m[1]);
    if (text.length < 60 || out.includes(text)) continue;
    if (/cookies?|newsletter|abonnez-vous|subscribe|partagez|share this|tous droits réservés|all rights reserved|©/i.test(text) && text.length < 200) continue;
    out.push(text);
  }
  return out;
}

/** "Lorem ipsum…" from the first paragraphs, cut at a sentence end near `max` characters. */
export function summaryFrom(paragraphs: string[], max = 400): string | null {
  let text = "";
  for (const p of paragraphs) {
    if (text.length >= 160) break;
    text = text ? `${text} ${p}` : p;
  }
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > 120 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

const num = (value: string | undefined) => {
  const n = parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** The largest entry of a srcset ("a.jpg 480w, b.jpg 1200w" → b.jpg, 1200). */
function largestSrcset(srcset: string | undefined): { url: string; width?: number } | null {
  if (!srcset) return null;
  let best: { url: string; width?: number } | null = null;
  for (const part of srcset.split(",")) {
    const [url, descriptor] = part.trim().split(/\s+/);
    if (!url) continue;
    const width = descriptor?.endsWith("w") ? num(descriptor) : undefined;
    if (!best || (width ?? 0) > (best.width ?? 0)) best = { url, width };
  }
  return best;
}

/** Every picture the page offers as its image, best sources first, de-duplicated. */
export function imageCandidates(html: string, pageUrl: URL): ImageCandidate[] {
  const meta: Record<string, string> = {};
  for (const m of html.slice(0, 512 * 1024).matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(m[0]);
    const key = (a.property || a.name || "").toLowerCase();
    if (key && a.content && !(key in meta)) meta[key] = a.content;
  }

  const found: ImageCandidate[] = [];
  const add = (raw: string | undefined, source: ImageCandidate["source"], width?: number, height?: number) => {
    const url = absoluteHttpUrl(raw, pageUrl);
    if (!url || NOT_CONTENT_IMAGE.test(url) || found.some((c) => c.url === url)) return;
    found.push({ url, source, width, height });
  };

  add(meta["og:image:secure_url"] ?? meta["og:image"] ?? meta["og:image:url"], "og", num(meta["og:image:width"]), num(meta["og:image:height"]));
  add(meta["twitter:image"] ?? meta["twitter:image:src"], "twitter");

  // schema.org Article image: a URL, an ImageObject or a list of them.
  for (const m of html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const visit = (node: unknown, depth: number): void => {
        if (!node || typeof node !== "object" || depth > 4) return;
        if (Array.isArray(node)) return node.forEach((n) => visit(n, depth + 1));
        const r = node as Record<string, unknown>;
        const image = r.image ?? r.thumbnailUrl;
        for (const img of Array.isArray(image) ? image : [image]) {
          if (typeof img === "string") add(img, "jsonld");
          else if (img && typeof img === "object") {
            const o = img as Record<string, unknown>;
            add(typeof o.url === "string" ? o.url : undefined, "jsonld", Number(o.width) || undefined, Number(o.height) || undefined);
          }
        }
        if (r["@graph"]) visit(r["@graph"], depth + 1);
      };
      visit(JSON.parse(m[1]), 0);
    } catch {
      // invalid JSON-LD: ignore
    }
  }

  // Pictures inside the article body, the largest srcset variant when there is one.
  for (const m of contentArea(html).matchAll(/<img\b[^>]*>/gi)) {
    const a = attributes(m[0]);
    const big = largestSrcset(a.srcset || a["data-srcset"]);
    const src = big?.url || a["data-src"] || a["data-lazy-src"] || a.src;
    add(src, "content", big?.width ?? num(a.width), num(a.height));
    if (found.length >= 12) break;
  }
  return found;
}

/**
 * Measures candidates (declared sizes first, so a page saying 150×150 isn't even
 * downloaded) and returns the first big enough picture.
 */
export async function chooseCover(candidates: ImageCandidate[]): Promise<{ cover: ScrapedArticle["cover"]; coverCheck: ScrapedArticle["coverCheck"] }> {
  if (candidates.length === 0) return { cover: null, coverCheck: "none" };
  let probes = 0;
  let unreadable: string | null = null;
  for (const c of candidates) {
    // Declared too small (both sides known): skip without downloading.
    if (c.width && c.height && !isBigCover({ width: c.width, height: c.height })) continue;
    if (c.width && c.width < 400) continue;
    if (probes++ >= MAX_PROBES) break;
    const size = await probeImage(c.url);
    if (isBigCover(size)) return { cover: { url: c.url, width: size!.width, height: size!.height }, coverCheck: "ok" };
    // The page's declared image that the server can't read: the browser may still show it.
    if (!size && !unreadable && c.source !== "content") unreadable = c.url;
  }
  if (unreadable) return { cover: { url: unreadable, width: 0, height: 0 }, coverCheck: "ok" };
  return { cover: null, coverCheck: "too_small" };
}

/** Reads and analyses an article page. */
export async function analyzeArticle(input: string): Promise<{ ok: true; article: ScrapedArticle } | { ok: false; reason: PreviewFailure }> {
  const page = await fetchPublic(input, { maxBytes: HTML_BYTES });
  if (!page.ok) return { ok: false, reason: page.reason };

  const preview = parseMetadata(page.body, page.url, page.contentLanguage);
  const paragraphs = articleParagraphs(page.body);
  const text = paragraphs.join(" ");
  const wordCount = text ? text.split(/\s+/).length : 0;
  const { cover, coverCheck } = await chooseCover(imageCandidates(page.body, page.url));

  return {
    ok: true,
    article: {
      url: page.url.toString(),
      preview,
      summary: summaryFrom(paragraphs),
      text: text.slice(0, 3000),
      wordCount,
      // About 230 words a minute; a page with almost no prose has no meaningful reading time.
      readingMinutes: wordCount >= 120 ? Math.max(1, Math.round(wordCount / 230)) : null,
      cover,
      coverCheck,
    },
  };
}
