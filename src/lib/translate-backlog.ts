import { prisma } from "./db";
import { detectLanguage, isFrench } from "./language";
import { frenchTitle, translateToFrench } from "./translate";

const POST_TYPES = ["story", "ask", "show", "job"];
/** Recent publications checked on each run (by id: imports keep their original date). */
const SCAN = 1000;

export interface BacklogResult {
  /** Publications whose title or excerpt is not French yet. */
  waiting: number;
  translated: number;
}

/**
 * Catch-up for translation: titles and excerpts still not in French (the free
 * translator's daily quota ran out, it took Portuguese for French, a site declared
 * the wrong language…) are translated a few at a time by the scheduled import, so
 * nothing depends on someone opening the article. What still fails is relabelled
 * with its real language and tried again next time.
 */
export async function translateBacklog({ max = 15, budgetMs = 40_000 }: { max?: number; budgetMs?: number } = {}): Promise<BacklogResult> {
  const started = Date.now();
  const rows = await prisma.item.findMany({
    where: { type: { in: POST_TYPES }, deleted: false, status: { not: "trash" } },
    orderBy: { id: "desc" },
    take: SCAN,
    select: { id: true, title: true, titleLang: true, originalTitle: true, excerpt: true, excerptLang: true },
  });
  const waiting = rows.filter((r) => (r.title && !isFrench(r.title, r.titleLang)) || (r.excerpt && !isFrench(r.excerpt, r.excerptLang)));

  let translated = 0;
  for (const row of waiting.slice(0, max)) {
    if (Date.now() - started > budgetMs) break;
    const data: { title?: string; titleLang?: string; originalTitle?: string | null; excerpt?: string; excerptLang?: string } = {};

    if (row.title && !isFrench(row.title, row.titleLang)) {
      const title = await frenchTitle(row.title, row.titleLang);
      if (title.titleLang === "fr" && title.title !== row.title) {
        Object.assign(data, { title: title.title, titleLang: "fr", originalTitle: row.originalTitle ?? row.title });
      } else {
        data.titleLang = detectLanguage(row.title) ?? (row.titleLang === "fr" ? "und" : row.titleLang ?? "und");
      }
    }

    if (row.excerpt && !isFrench(row.excerpt, row.excerptLang)) {
      const excerpt = await translateToFrench(row.excerpt, row.excerptLang);
      if (excerpt && excerpt.text !== row.excerpt) Object.assign(data, { excerpt: excerpt.text, excerptLang: "fr" });
      else data.excerptLang = detectLanguage(row.excerpt) ?? (row.excerptLang === "fr" ? "und" : row.excerptLang ?? "und");
    }

    await prisma.item.update({ where: { id: row.id }, data });
    if (data.titleLang === "fr" || data.excerptLang === "fr") translated++;
  }
  return { waiting: waiting.length, translated };
}
