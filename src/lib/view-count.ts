import { prisma } from "./db";

/*
 * « Les plus populaires »: how many visitors consulted a publication, either by
 * opening its article from a list (the title links straight to the source site)
 * or by viewing its page. A visitor counts once per publication per day.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const seen = new Map<string, number>();

/** Whether this visitor already consulted this publication today (per server instance; the browser also keeps its own list). */
export function alreadyCounted(visitorId: string, itemId: number, now = Date.now()): boolean {
  const key = `${visitorId}:${itemId}`;
  const at = seen.get(key);
  if (at && now - at < DAY_MS) return true;
  if (seen.size > 50_000) seen.clear();
  seen.set(key, now);
  return false;
}

/** The publication id of a "/publication/123" path, else null. */
export function publicationId(path: string): number | null {
  const id = Number(path.match(/^\/publication\/(\d{1,9})$/)?.[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** +1 consultation (stories, questions… not comments). */
export async function countConsultation(itemId: number, visitorId: string): Promise<void> {
  if (alreadyCounted(visitorId, itemId)) return;
  await prisma.item.updateMany({ where: { id: itemId, type: { not: "comment" } }, data: { viewCount: { increment: 1 } } });
}
