/**
 * French translation of short texts (article excerpts) through MyMemory's free API.
 * Anonymous use allows roughly 5,000 characters a day; setting MYMEMORY_EMAIL to a
 * contact address raises that to 50,000. Failures return null so callers can keep
 * the original text and retry later.
 */

const ENDPOINT = "https://api.mymemory.translated.net/get";
const TIMEOUT_MS = 8000;
const MAX_QUERY_BYTES = 480; // MyMemory rejects queries over 500 bytes

export interface Translation {
  text: string;
  /** Language the text was in, as detected or given. */
  sourceLang: string | null;
}

/** Cuts text to fit the API limit, preferring a sentence or word boundary. */
export function fitToBytes(text: string, maxBytes = MAX_QUERY_BYTES): string {
  const encoder = new TextEncoder();
  if (encoder.encode(text).length <= maxBytes) return text;

  let cut = text;
  while (encoder.encode(`${cut}…`).length > maxBytes) cut = cut.slice(0, -1);
  const sentence = cut.match(/^[\s\S]*[.!?](?=\s)/)?.[0];
  if (sentence && sentence.length > cut.length * 0.6) return sentence;
  const word = cut.replace(/\s+\S*$/, "");
  return `${word.length > cut.length * 0.6 ? word : cut}…`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Translates `text` into French. `sourceLang` (e.g. "en") is used when known,
 * otherwise MyMemory detects it. Returns the text unchanged when it's already French.
 */
export async function translateToFrench(text: string, sourceLang?: string | null): Promise<Translation | null> {
  const query = fitToBytes(text.trim());
  if (!query) return null;
  if (sourceLang === "fr") return { text: query, sourceLang: "fr" };

  const params = new URLSearchParams({ q: query, langpair: `${sourceLang || "autodetect"}|fr` });
  if (process.env.MYMEMORY_EMAIL) params.set("de", process.env.MYMEMORY_EMAIL);

  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      responseStatus?: number | string;
      quotaFinished?: boolean;
      responseData?: { translatedText?: string; detectedLanguage?: string };
    };

    const translated = data.responseData?.translatedText?.trim();
    if (Number(data.responseStatus) !== 200 || data.quotaFinished || !translated) return null;
    // Quota and error notices come back as "translations" in capitals.
    if (/^(MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR|PLEASE SELECT TWO DISTINCT LANGUAGES)/i.test(translated)) {
      return null;
    }

    const detected = data.responseData?.detectedLanguage?.toLowerCase().split("-")[0] ?? sourceLang ?? null;
    if (detected === "fr") return { text: query, sourceLang: "fr" };
    return { text: decodeEntities(translated), sourceLang: detected };
  } catch {
    return null;
  }
}
