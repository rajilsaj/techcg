import { prisma } from "@/lib/db";
import { voteChange, type VoteDirection, type VoteValue } from "@/lib/vote-change";

export { isVoteDirection, voteChange, type VoteDirection, type VoteValue } from "@/lib/vote-change";

export type CastVoteResult =
  | { ok: true; vote: VoteValue; points: number }
  | { ok: false; reason: "userNotFound" | "tooNew" | "itemNotFound" };

/** Records an up/down vote (or removes it) and updates the item's points. */
export async function castVote(userId: number, itemId: number, direction: VoteDirection): Promise<CastVoteResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, karma: true } });
  if (!user) return { ok: false, reason: "userNotFound" };

  // New accounts (under 24h) without karma can't vote yet.
  if (Date.now() - user.createdAt.getTime() < 24 * 60 * 60 * 1000 && user.karma === 0) {
    return { ok: false, reason: "tooNew" };
  }

  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) return { ok: false, reason: "itemNotFound" };

  return prisma.$transaction(async (tx) => {
    const existing = await tx.vote.findUnique({
      where: { userId_itemId: { userId, itemId } },
      select: { id: true, value: true },
    });
    const current: VoteValue = existing ? (existing.value < 0 ? -1 : 1) : 0;
    const { next, delta } = voteChange(current, direction);

    if (next === 0) await tx.vote.delete({ where: { id: existing!.id } });
    else if (existing) await tx.vote.update({ where: { id: existing.id }, data: { value: next } });
    else await tx.vote.create({ data: { userId, itemId, value: next } });

    const updated = await tx.item.update({
      where: { id: itemId },
      data: { points: { increment: delta } },
      select: { points: true },
    });
    return { ok: true as const, vote: next, points: updated.points };
  });
}

/** The viewer's votes on the given items, by item id (items without a vote are absent). */
export async function viewerVotes(userId: number | null | undefined, itemIds: number[]): Promise<Map<number, VoteValue>> {
  const votes = new Map<number, VoteValue>();
  if (!userId || itemIds.length === 0) return votes;
  const rows = await prisma.vote.findMany({
    where: { userId, itemId: { in: itemIds } },
    select: { itemId: true, value: true },
  });
  for (const row of rows) votes.set(row.itemId, row.value < 0 ? -1 : 1);
  return votes;
}
