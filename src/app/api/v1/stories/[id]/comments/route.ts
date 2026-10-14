import { revalidatePath } from "next/cache";
import { endpoint, fromRefusal, idParam, json, preflight, readBody, stringField } from "@/lib/api/http";
import { requireCaller } from "@/lib/api/keys";
import { commentsPage, storyById } from "@/lib/api/stories";
import { postComment } from "@/lib/publish";

/** GET /api/v1/stories/{id}/comments: newest first, `?before=<id>` for older ones. */
export const GET = endpoint<{ id: string }>(async (request, { params }) => {
  const id = idParam((await params).id);
  await storyById(id, null, ""); // 404 for unknown or hidden publications
  return json(await commentsPage(new URL(request.url).searchParams, id));
});

/** POST /api/v1/stories/{id}/comments  { text } */
export const POST = endpoint<{ id: string }>(async (request, { params }) => {
  const id = idParam((await params).id);
  const caller = await requireCaller(request);
  const text = stringField(await readBody(request), "text", { required: true, max: 10000 })!;
  const result = await postComment(caller, id, text);
  if (!result.ok) throw fromRefusal(result);
  revalidatePath(`/publication/${id}`);
  revalidatePath(`/discussions/${id}`);
  return json({ data: { id: result.commentId, storyId: id, status: result.pending ? "pending" : "published" } }, 201);
});

export const OPTIONS = preflight;
