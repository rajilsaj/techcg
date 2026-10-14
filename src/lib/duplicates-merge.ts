import { prisma } from "./db";
import { duplicateGroups, type DuplicateCandidate } from "./duplicates";

/**
 * Duplicates are looked for among the most recently added publications (by id: an
 * imported article keeps its original date, which can be months old).
 */
const SCAN_LIMIT = 3000;
const POST_TYPES = ["story", "ask", "show", "job"];

export interface DuplicateRow extends DuplicateCandidate {
  url: string | null;
  status: string;
  source: string | null;
}

/** Groups of visible publications that are the same article, the one to keep first. */
export async function findDuplicateGroups(): Promise<DuplicateRow[][]> {
  const rows = await prisma.item.findMany({
    where: {
      type: { in: POST_TYPES },
      deleted: false,
      status: { not: "trash" },
    },
    orderBy: { id: "desc" },
    take: SCAN_LIMIT,
    select: {
      id: true,
      title: true,
      originalTitle: true,
      url: true,
      urlKey: true,
      status: true,
      createdAt: true,
      commentCount: true,
      points: true,
      viewCount: true,
      importSource: { select: { name: true } },
    },
  });
  const items: DuplicateRow[] = rows.map(({ importSource, ...r }) => ({ ...r, source: importSource?.name ?? null }));
  return duplicateGroups(items).sort((a, b) => b[0].createdAt.getTime() - a[0].createdAt.getTime());
}

/**
 * Merges a group: the first one stays, the others go to the trash (restorable) and
 * their consultations are added to it. A copy with comments is never trashed: its
 * discussion would disappear; it is reported instead (`kept`).
 */
export async function mergeGroup(group: DuplicateRow[]): Promise<{ trashed: number[]; kept: number[] }> {
  const [keep, ...others] = group;
  const trashed = others.filter((o) => o.commentCount === 0);
  const kept = others.filter((o) => o.commentCount > 0).map((o) => o.id);
  if (trashed.length === 0) return { trashed: [], kept };
  await prisma.$transaction([
    prisma.item.updateMany({ where: { id: { in: trashed.map((t) => t.id) }, commentCount: 0 }, data: { status: "trash" } }),
    prisma.item.update({ where: { id: keep.id }, data: { viewCount: { increment: trashed.reduce((n, t) => n + t.viewCount, 0) } } }),
  ]);
  return { trashed: trashed.map((t) => t.id), kept };
}
