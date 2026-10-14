import { ApiError, endpoint, ok, preflight, readBody } from "@/lib/api/http";
import { requireCaller } from "@/lib/api/keys";
import { castVote, isVoteDirection } from "@/lib/votes";

/**
 * POST /api/v1/votes  { itemId, value?: 1 | -1 }: upvote (default) or downvote.
 * Sending the same value again removes the vote.
 */
export const POST = endpoint(async (request) => {
  const caller = await requireCaller(request);
  const body = await readBody(request);
  const itemId = body.itemId;
  const value = body.value ?? 1;
  if (typeof itemId !== "number" || !Number.isInteger(itemId) || !isVoteDirection(value)) {
    throw new ApiError("validation", "itemId (entier) requis ; value doit valoir 1 ou -1.");
  }
  const result = await castVote(caller.userId, itemId, value);
  if (!result.ok) {
    if (result.reason === "itemNotFound") throw new ApiError("not_found");
    if (result.reason === "tooNew") throw new ApiError("forbidden", "Les nouveaux comptes peuvent voter après 24 heures.");
    throw new ApiError("unauthorized");
  }
  return ok({ itemId, vote: result.vote, points: result.points });
});

export const OPTIONS = preflight;
