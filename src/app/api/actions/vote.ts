"use server";

import { getSession } from "@/lib/auth";
import { castVote, isVoteDirection, type VoteValue } from "@/lib/votes";
import { t } from "@/i18n";

const REASONS = {
  userNotFound: "action.userNotFound",
  tooNew: "action.newAccountVoteWait",
  itemNotFound: "action.itemNotFound",
} as const;

/** Upvote (1) or downvote (-1) an item; the same arrow again removes the vote. */
export async function voteAction(
  itemId: number,
  direction: number
): Promise<{ error?: string; vote?: VoteValue; points?: number }> {
  const session = await getSession();
  if (!session) return { error: t("action.notAuthenticated") };
  if (!Number.isInteger(itemId) || !isVoteDirection(direction)) return { error: t("action.itemNotFound") };

  const result = await castVote(session.userId, itemId, direction);
  if (!result.ok) return { error: t(REASONS[result.reason]) };
  return { vote: result.vote, points: result.points };
}
