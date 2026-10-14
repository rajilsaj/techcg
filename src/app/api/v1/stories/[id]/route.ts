import { prisma } from "@/lib/db";
import { ApiError, endpoint, idParam, ok, preflight, readBody, siteOrigin, stringField } from "@/lib/api/http";
import { apiCaller, requireCaller } from "@/lib/api/keys";
import { ownStory, storyById } from "@/lib/api/stories";
import { logActivity } from "@/lib/activity";

/** GET /api/v1/stories/{id} */
export const GET = endpoint<{ id: string }>(async (request, { params }) => {
  const id = idParam((await params).id);
  return ok(await storyById(id, await apiCaller(request), siteOrigin(request)));
});

/** PATCH /api/v1/stories/{id}  { title?, text? }: the author or an admin. */
export const PATCH = endpoint<{ id: string }>(async (request, { params }) => {
  const id = idParam((await params).id);
  const caller = await requireCaller(request);
  const story = await ownStory(id, caller);
  const body = await readBody(request);

  const title = stringField(body, "title", { max: 500 })?.trim();
  const text = stringField(body, "text", { max: 20000 })?.trim();
  if (body.title !== undefined && !title) throw new ApiError("validation", "Le titre ne peut pas être vide.", { field: "title" });
  if (title === undefined && text === undefined) throw new ApiError("validation", "Rien à modifier : envoyez title et/ou text.");
  if (text && story.url && story.type === "story") throw new ApiError("validation", "Un lien ne peut pas avoir de texte.", { field: "text" });

  await prisma.item.update({ where: { id }, data: { ...(title !== undefined ? { title } : {}), ...(text !== undefined ? { text: text || null } : {}) } });
  return ok(await storyById(id, caller, siteOrigin(request)));
});

/** DELETE /api/v1/stories/{id}: moves it to the trash (the author or an admin). */
export const DELETE = endpoint<{ id: string }>(async (request, { params }) => {
  const id = idParam((await params).id);
  const caller = await requireCaller(request);
  await ownStory(id, caller);
  await prisma.item.update({ where: { id }, data: { status: "trash" } });
  if (caller.isAdmin) await logActivity(caller.userId, "item.trash", `Publication #${id} mise à la corbeille (API)`, { type: "item", id });
  return ok({ id, deleted: true });
});

export const OPTIONS = preflight;
