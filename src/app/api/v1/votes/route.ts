import { createSuccessResponse, createErrorResponse, handleApiError } from "@/lib/api-utils";
import { API_ERRORS } from "@/types/api";
import { getSession } from "@/lib/auth";
import { castVote, isVoteDirection } from "@/lib/votes";
import { NextRequest } from "next/server";

/**
 * POST { itemId, value?: 1 | -1 } — upvote (default) or downvote as the signed-in
 * user. Sending the same value again removes the vote.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return createErrorResponse(API_ERRORS.UNAUTHORIZED, 401);

    const body = await request.json().catch(() => null);
    const itemId = body?.itemId;
    const value = body?.value ?? 1;
    if (!Number.isInteger(itemId) || !isVoteDirection(value)) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 400, { message: "itemId (integer) required; value must be 1 or -1" });
    }

    const result = await castVote(session.userId, itemId, value);
    if (!result.ok) {
      if (result.reason === "itemNotFound") return createErrorResponse(API_ERRORS.NOT_FOUND, 404);
      if (result.reason === "tooNew") return createErrorResponse(API_ERRORS.FORBIDDEN, 403, { message: "New accounts must wait 24 hours before voting" });
      return createErrorResponse(API_ERRORS.UNAUTHORIZED, 401);
    }

    return createSuccessResponse({ itemId, vote: result.vote, points: result.points });
  } catch (error) {
    return handleApiError(error);
  }
}
