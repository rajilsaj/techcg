import { prisma } from "../db";
import { analyzeArticle } from "./article";
import { isBigCover, probeImage, worthKeeping } from "./image-size";

export interface ReanalyzeReport {
  analyzed: number;
  /** Stories whose picture was replaced by a larger one found on the page. */
  improved: number;
  /** Stories whose picture was too small or broken: they now show the topic's cover. */
  removed: number;
  remaining: number;
}

/**
 * "Analyser les articles" (Admin › Importation): runs the advanced scraper on
 * stories never analysed, newest first, until the time budget runs out. Updates
 * the picture (only a measured, large one is kept) and the reading time; the
 * title, excerpt and tags are left as they are.
 */
export async function reanalyzeStories(budgetMs: number): Promise<ReanalyzeReport> {
  const started = Date.now();
  const pending = { type: "story", url: { not: null }, analyzedAt: null } as const;
  const stories = await prisma.item.findMany({
    where: pending,
    orderBy: { id: "desc" },
    take: 80,
    select: { id: true, url: true, imageUrl: true },
  });

  const report: ReanalyzeReport = { analyzed: 0, improved: 0, removed: 0, remaining: 0 };
  for (let i = 0; i < stories.length && Date.now() - started < budgetMs; i += 4) {
    await Promise.all(
      stories.slice(i, i + 4).map(async (story) => {
        const result = await analyzeArticle(story.url!);
        let imageUrl = story.imageUrl;
        let readingMinutes: number | null = null;
        if (result.ok) {
          readingMinutes = result.article.readingMinutes;
          const cover = result.article.cover;
          const current = story.imageUrl ? await probeImage(story.imageUrl) : null;
          // Keep a current picture measured as large; else the page's cover; else the current one if unreadable (not proven small).
          if (story.imageUrl && isBigCover(current)) imageUrl = story.imageUrl;
          else if (cover) imageUrl = cover.url;
          else imageUrl = story.imageUrl && current === null ? story.imageUrl : null;
        } else if (!(await worthKeeping(story.imageUrl))) {
          imageUrl = null;
        }
        if (imageUrl !== story.imageUrl) report[imageUrl ? "improved" : "removed"]++;
        await prisma.item.update({ where: { id: story.id }, data: { imageUrl, readingMinutes, analyzedAt: new Date() } });
        report.analyzed++;
      })
    );
  }
  report.remaining = await prisma.item.count({ where: pending });
  return report;
}
