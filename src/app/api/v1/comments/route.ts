import { revalidatePath } from "next/cache";
import { ApiError, endpoint, fromRefusal, json, preflight, readBody, stringField } from "@/lib/api/http";
import { requireCaller } from "@/lib/api/keys";
import { commentsPage } from "@/lib/api/stories";
import { postComment } from "@/lib/publish";

/** GET /api/v1/comments: the latest comments on the whole site (`?storyId=` for one publication). */
export const GET = endpoint(async (request) => {
  const params = new URL(request.url).searchParams;
  const raw = params.get("storyId") ?? params.get("itemId");
  const storyId = raw === null ? undefined : Number(raw);
  if (storyId !== undefined && (!Number.isInteger(storyId) || storyId <= 0)) throw new ApiError("validation", "storyId doit être un identifiant.");
  return json(await commentsPage(params, storyId));
});

/** POST /api/v1/comments  { storyId, text } (same as POST /stories/{id}/comments). */
export const POST = endpoint(async (request) => {
  const caller = await requireCaller(request);
  const body = await readBody(request);
  const storyId = body.storyId ?? body.parentId;
  if (typeof storyId !== "number" || !Number.isInteger(storyId)) throw new ApiError("validation", "storyId (entier) requis.", { field: "storyId" });
  const text = stringField(body, "text", { required: true, max: 10000 })!;
  const result = await postComment(caller, storyId, text);
  if (!result.ok) throw fromRefusal(result);
  revalidatePath(`/publication/${storyId}`);
  revalidatePath(`/discussions/${storyId}`);
  return json({ data: { id: result.commentId, storyId, status: result.pending ? "pending" : "published" } }, 201);
});

export const OPTIONS = preflight;
