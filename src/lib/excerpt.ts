/** Comparable form of a word: lowercase, no accents, no punctuation or quote styles. */
function word(token: string): string {
  return token
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Many feeds start an item's summary by repeating its title. Drops that repeated
 * title (and the dash, colon or punctuation after it) so the excerpt doesn't
 * duplicate the headline shown just above it. Keeps the original text when too
 * little would remain.
 */
export function stripLeadingTitle(summary: string, title: string | null | undefined): string {
  if (!title) return summary;
  const titleWords = title.split(/\s+/).map(word).filter(Boolean);
  if (titleWords.length < 3) return summary;

  // Walk the summary's words, matching the title's words in order.
  const tokens = [...summary.matchAll(/\S+/g)];
  let t = 0;
  let end = 0;
  for (const token of tokens) {
    const w = word(token[0]);
    if (!w) continue; // stray punctuation such as « or —
    if (w !== titleWords[t]) break;
    t++;
    end = (token.index ?? 0) + token[0].length;
    if (t === titleWords.length) break;
  }
  if (t < titleWords.length) return summary;

  let rest = summary.slice(end);
  // Feeds sometimes cut the title mid-phrase ("…constitue un délit" while the summary
  // goes on "…un délit mineur » Anthropic a déclaré"). If the match doesn't end at a
  // break, skip to the end of that phrase; with no clear break, leave the summary alone.
  if (/^\s*[\p{Ll}\p{N}]/u.test(rest)) {
    const phraseEnd = rest.match(/^[^.!?»"”]{0,80}?[.!?»"”]\s+(?=[\p{Lu}«"“])/u);
    if (!phraseEnd) return summary;
    rest = rest.slice(phraseEnd[0].length);
  }
  rest = rest.replace(/^[\s»"”'’.,;:!?…\-–—|]+/, "").trim();
  if (rest.length < 30) return summary;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/**
 * Removes feed boilerplate from a summary: WordPress's "The post … appeared first
 * on Site." / "… first appeared on Site." footer and "click here / read more" lines.
 */
export function stripFeedBoilerplate(summary: string): string {
  return summary
    .replace(/\s*The post\s.*?\s(?:first appeared|appeared first) on\s.*$/is, "")
    .replace(/\s*(?:L'article|Cet article)\s.*?\s(?:est apparu en premier sur|a été publié en premier sur)\s.*$/is, "")
    .replace(/^\s*(?:Cliquez ici pour (?:voir|lire)[^.!]*?(?:vidéos?|articles?|suite)\.?|Click here to (?:watch|read)[^.!]*?\.?)\s*/i, "")
    .replace(/\s*(?:Lire la suite|Read more|Continue reading)\s*(?:…|\.\.\.|»|→)?\s*$/i, "")
    .trim();
}
