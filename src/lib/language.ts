/*
 * Language of a short text (a title, an excerpt) from its most common words. Used
 * before and after translation: the translator's own detection, and the language a
 * site declares, are sometimes wrong (Portuguese taken for French, an English press
 * release on a French site).
 */

export type DetectedLanguage = "fr" | "en" | "pt" | "es";

// Frequent short words that are specific to one language (shared ones like "de", "a", "que" are left out).
const WORDS: Record<DetectedLanguage, string[]> = {
  fr: ["le", "la", "les", "des", "du", "une", "et", "est", "pour", "dans", "avec", "sur", "qui", "au", "aux", "ce", "cette", "ses", "sont", "pas", "plus", "par", "leur", "leurs", "nous", "vous", "il", "elle", "ils", "été", "être", "après", "selon", "entre", "lance", "nouveau", "nouvelle"],
  en: ["the", "and", "of", "to", "is", "are", "with", "for", "from", "how", "why", "what", "its", "this", "that", "will", "has", "have", "says", "was", "were", "be", "by", "on", "it", "their", "after", "new", "launches", "about", "into", "than", "can", "more"],
  pt: ["para", "com", "não", "uma", "dos", "das", "pelo", "pela", "são", "está", "também", "mais", "ao", "aos", "como", "seu", "sua", "foi", "pelos", "é", "nos", "nas", "num", "numa", "já", "isso", "reforça", "cria", "lança", "novos", "novo", "nova"],
  es: ["el", "los", "las", "del", "con", "una", "según", "también", "más", "y", "es", "su", "sus", "fue", "nuevo", "nueva", "lanza", "hasta", "desde", "sobre"],
};

const LOOKUP = new Map<string, DetectedLanguage[]>();
for (const [lang, words] of Object.entries(WORDS) as [DetectedLanguage, string[]][]) {
  for (const w of words) LOOKUP.set(w, [...(LOOKUP.get(w) ?? []), lang]);
}

/** Letters and endings that point to one language. */
const MARKS: [DetectedLanguage, RegExp][] = [
  ["pt", /ção\b|ções\b|ões\b|[ãõ]/gi],
  ["es", /ción\b|ciones\b|[ñ¿¡]/gi],
  ["fr", /\b(l|d|qu|n|s|c|j)['’]\p{L}|[èêëîïûùœ]|eaux?\b/giu],
  // "saying", "suing", "OpenAI's" (a French title with "marketing" still has its own words to win).
  ["en", /\p{L}{2,}ing\b|\p{L}['’]s\b/giu],
];

/**
 * The text's language, or null when it can't be told (too short, mixed, or another
 * language). Confident only when one language clearly leads.
 */
export function detectLanguage(text: string | null | undefined): DetectedLanguage | null {
  if (!text) return null;
  const score: Record<DetectedLanguage, number> = { fr: 0, en: 0, pt: 0, es: 0 };
  for (const word of text.toLowerCase().match(/\p{L}+/gu) ?? []) {
    for (const lang of LOOKUP.get(word) ?? []) score[lang] += 1;
  }
  for (const [lang, re] of MARKS) score[lang] += Math.min(3, (text.match(re) ?? []).length);

  const ranked = (Object.entries(score) as [DetectedLanguage, number][]).sort((a, b) => b[1] - a[1]);
  const [[best, top], [, second]] = ranked;
  if (top < 2 || top < second * 1.5 + 0.5) return null;
  return best;
}

/**
 * Is this text French? What the text itself says wins over the declared language;
 * when the text can't tell (a short title), the declared language decides.
 */
export function isFrench(text: string | null | undefined, declared?: string | null): boolean {
  const detected = detectLanguage(text);
  return detected ? detected === "fr" : declared === "fr";
}
