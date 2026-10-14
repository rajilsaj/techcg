import { cleanKeywords, decodeEntities, plainText, primaryLanguage } from "../link-preview";
import { stripFeedBoilerplate, stripLeadingTitle } from "../excerpt";

/** One article found on a source, before it becomes a story. */
export interface FoundArticle {
  title: string;
  url: string;
  publishedAt: Date | null;
  summary: string | null;
  image: string | null;
  /** Categories/tags the source gives the article. */
  keywords: string[];
  /** Language of this article when known per article (page scraping). */
  language?: string | null;
  /** Set when the article page was analysed (advanced scraper). */
  readingMinutes?: number | null;
  analyzed?: boolean;
  /** Opening of the article's main text, for topic detection. */
  text?: string;
}

export interface ParsedFeed {
  language: string | null;
  articles: FoundArticle[];
}

/* ---------- Small XML helpers (feeds are simple enough not to need a parser) ---------- */

function unwrapCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

/** Text of the first <tag>…</tag> (namespaced names allowed, e.g. "content:encoded"). */
function tagText(xml: string, tag: string): string | null {
  const escaped = tag.replace(":", "\\:");
  const m = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "i"));
  return m ? unwrapCdata(m[1]).trim() : null;
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? decodeEntities(m[1] ?? m[2] ?? "") : null;
}

function absolute(value: string | null | undefined, base: URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim(), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** First image in an item: enclosure, media:content/thumbnail, then an <img> in the HTML body. */
function itemImage(item: string, html: string, base: URL): string | null {
  for (const m of item.matchAll(/<(enclosure|media:content|media:thumbnail)\b[^>]*>/gi)) {
    const type = attr(m[0], "type") ?? attr(m[0], "medium") ?? "";
    const url = attr(m[0], "url");
    if (url && (m[1].toLowerCase() !== "enclosure" || /image/i.test(type) || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url))) {
      const abs = absolute(url, base);
      if (abs) return abs;
    }
  }
  const img = decodeEntities(html).match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  return absolute(img, base);
}

/** RSS <category>/<dc:subject> texts and Atom <category term|label>. */
function itemCategories(item: string): string[] {
  const found: string[] = [];
  for (const m of item.matchAll(/<(category|dc:subject)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi)) {
    const text = m[3] !== undefined ? plainText(decodeEntities(unwrapCdata(m[3]))) : "";
    const tag = `<x ${m[2]}>`;
    found.push(text || attr(tag, "label") || attr(tag, "term") || "");
  }
  return cleanKeywords(found.flatMap((value) => value.split(/[,;]/)));
}

/* ---------- Feeds ---------- */

export function looksLikeFeed(body: string): boolean {
  return /<(rss|feed|rdf:RDF)\b/i.test(body.slice(0, 2000));
}

/** Parses RSS 2.0, RSS 1.0 (RDF) and Atom. */
export function parseFeed(xml: string, feedUrl: URL): ParsedFeed {
  const language = primaryLanguage(tagText(xml, "language") ?? xml.match(/<feed\b[^>]*\bxml:lang\s*=\s*["']([^"']+)/i)?.[1]);
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);

  const articles: FoundArticle[] = [];
  for (const block of blocks) {
    const title = plainText(decodeEntities(tagText(block, "title") ?? ""));
    // Atom: <link rel="alternate" href>; RSS: <link>url</link> (or <guid> as a fallback).
    const atomLink = [...block.matchAll(/<link\b[^>]*>/gi)]
      .map((m) => m[0])
      .find((tag) => attr(tag, "href") && (attr(tag, "rel") ?? "alternate") === "alternate");
    const link = absolute(atomLink ? attr(atomLink, "href") : decodeEntities(tagText(block, "link") ?? "") || tagText(block, "guid"), feedUrl);
    if (!title || !link) continue;

    const html =
      tagText(block, "description") ?? tagText(block, "summary") ?? tagText(block, "content:encoded") ?? tagText(block, "content") ?? "";
    const summary = stripLeadingTitle(stripFeedBoilerplate(plainText(decodeEntities(html))), title);
    articles.push({
      title: clip(title, 300),
      url: link,
      publishedAt: parseDate(tagText(block, "pubDate") ?? tagText(block, "published") ?? tagText(block, "updated") ?? tagText(block, "dc:date")),
      summary: summary ? clip(summary, 300) : null,
      image: itemImage(block, html + (tagText(block, "content:encoded") ?? ""), feedUrl),
      keywords: itemCategories(block),
    });
  }
  return { language, articles };
}

/** RSS/Atom feeds a page advertises with <link rel="alternate">. */
export function discoverFeeds(html: string, pageUrl: URL): string[] {
  const feeds: string[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const type = attr(tag, "type") ?? "";
    if (/alternate/i.test(attr(tag, "rel") ?? "") && /(rss|atom)\+xml/i.test(type)) {
      const href = absolute(attr(tag, "href"), pageUrl);
      if (href && !feeds.includes(href)) feeds.push(href);
    }
  }
  return feeds;
}

/* ---------- HTML fallback ---------- */

const SKIP_PATH = /\/(tag|tags|categorie|category|auteur|author|page|search|recherche|login|connexion|inscription|forum|forums|contact|about|a-propos|mentions|cgu|rss)(\/|$)/i;

/** Link text that says "read more" instead of naming the article. */
const READ_MORE = /^(lire( l['’]article| la suite| plus)?|en savoir plus|voir (l['’]article|plus)|read( more| the article| article)?|continue reading|leia mais|saiba mais|ler mais)\s*(»|›|→|\.\.\.|…)?$/i;

/** Links to a whole section (« Voir toutes nos publications »), not an article. */
const SEE_ALL = /^(voir|afficher|d[eé]couvrir|consulter|see|view|browse|ver)( (tout|toutes|tous|all|plus|more|todas|todos))\b/i;

/** The text of the last <h1>–<h4> in the 3,000 characters before `index`. */
function headingBefore(html: string, index: number): string | null {
  const before = html.slice(Math.max(0, index - 3000), index);
  const headings = [...before.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi)];
  const last = headings.at(-1);
  return last ? plainText(last[1]) || null : null;
}

/**
 * Article links on a listing page when there's no feed: same-site links whose text
 * reads like a headline, preferring ones inside headings or <article> blocks.
 */
export function scrapeArticleLinks(html: string, pageUrl: URL, limit: number): { title: string; url: string }[] {
  const body = html.replace(/<(script|style|noscript|nav|footer|header|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
  const candidates = new Map<string, { title: string; score: number }>();

  for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = absolute(attr(`<a ${m[1]}>`, "href"), pageUrl);
    if (!href) continue;
    const url = new URL(href);
    url.hash = "";
    if (url.hostname.replace(/^www\./, "") !== pageUrl.hostname.replace(/^www\./, "")) continue;
    if (url.pathname === "/" || url.pathname === pageUrl.pathname || SKIP_PATH.test(url.pathname)) continue;

    let title = plainText(m[2]);
    // A « Lire l'article » button under its headline: the headline is the nearest heading above it.
    if (READ_MORE.test(title)) title = headingBefore(body, m.index ?? 0) ?? title;
    if (title.length < 25 || title.length > 300 || title.split(" ").length < 4 || SEE_ALL.test(title)) continue;

    // Links that sit in a heading score higher than plain links.
    const before = body.slice(Math.max(0, (m.index ?? 0) - 120), m.index ?? 0);
    const score = (/<h[1-4]\b[^>]*>\s*$/i.test(before) ? 2 : 0) + (/<article\b/i.test(before) ? 1 : 0) + (url.pathname.split("/").length > 2 ? 1 : 0);
    const key = url.toString();
    const existing = candidates.get(key);
    if (!existing || score > existing.score) candidates.set(key, { title, score });
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([url, { title }]) => ({ url, title }));
}
