"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { backTo, requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";

function selectedIds(formData: FormData): number[] {
  return formData
    .getAll("ids")
    .map((v) => parseInt(String(v), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
}

/** Recomputes each story's comment count from its visible comments. */
async function recountComments(storyIds: number[]) {
  for (const id of new Set(storyIds)) {
    const count = await prisma.item.count({ where: { type: "comment", parentId: id, status: "published" } });
    await prisma.item.update({ where: { id }, data: { commentCount: count } });
  }
}

const ACTIONS: Record<string, { status?: string; notice: string; label: string }> = {
  approve: { status: "published", notice: "approved", label: "approuvé(s)" },
  unapprove: { status: "pending", notice: "unapproved", label: "mis en attente" },
  spam: { status: "spam", notice: "spam", label: "marqué(s) comme indésirable(s)" },
  trash: { status: "trash", notice: "trashed", label: "mis à la corbeille" },
  restore: { status: "published", notice: "restored", label: "restauré(s)" },
  delete: { notice: "deleted", label: "supprimé(s) définitivement" },
};

/** Bulk and single-row moderation actions. */
export async function moderateCommentsAction(formData: FormData) {
  const admin = await requireAdminAction();
  const back = backTo(formData, "/godmod/commentaires");
  // A row button sends "row" = "approve:42"; the bulk bar sends "bulk" plus the ticked ids.
  const [rowAction, rowId] = String(formData.get("row") ?? "").split(":");
  const ids = rowAction ? [parseInt(rowId, 10)].filter(Number.isInteger) : selectedIds(formData);
  const action = ACTIONS[rowAction || String(formData.get("bulk") ?? "")];
  if (ids.length === 0 || !action) redirect(withNotice(back, "no-selection"));

  const where = { id: { in: ids }, type: "comment" };
  const parents = await prisma.item.findMany({ where, select: { parentId: true } });

  if (action.status) {
    await prisma.item.updateMany({ where, data: { status: action.status } });
  } else {
    // Permanent deletion only for spam or trashed comments.
    await prisma.item.deleteMany({ where: { ...where, status: { in: ["spam", "trash"] } } });
  }

  await recountComments(parents.map((p) => p.parentId).filter((id): id is number => id !== null));
  await logActivity(admin.userId, "comments.moderate", `${ids.length} commentaire(s) ${action.label}`, { type: "comment" });
  revalidatePath("/", "layout");
  redirect(withNotice(back, action.notice));
}

/** Edits a comment's text. */
export async function editCommentAction(formData: FormData) {
  const admin = await requireAdminAction();
  const back = backTo(formData, "/godmod/commentaires");
  // The edit box of row 42 is named "edit-42"; its button sends editId=42.
  const id = parseInt(String(formData.get("editId")), 10);
  const text = String(formData.get(`edit-${id}`) ?? "").trim().slice(0, 10000);
  if (!Number.isInteger(id) || !text) redirect(withNotice(back, "no-selection"));

  await prisma.item.update({ where: { id, type: "comment" }, data: { text } });
  await logActivity(admin.userId, "comments.edit", `Commentaire #${id} modifié`, { type: "comment", id });
  revalidatePath("/", "layout");
  redirect(withNotice(back, "saved"));
}

/** Replies to a comment as the admin: a new, approved comment on the same story. */
export async function replyCommentAction(formData: FormData) {
  const admin = await requireAdminAction();
  const back = backTo(formData, "/godmod/commentaires");
  const id = parseInt(String(formData.get("replyTo")), 10);
  const text = String(formData.get(`reply-${id}`) ?? "").trim().slice(0, 10000);

  const original = await prisma.item.findUnique({
    where: { id },
    select: { type: true, parentId: true, author: { select: { username: true } } },
  });
  if (!original || original.type !== "comment" || !original.parentId || !text) redirect(withNotice(back, "no-selection"));

  const story = await prisma.item.findUnique({ where: { id: original.parentId }, select: { id: true, path: true } });
  if (!story) redirect(withNotice(back, "no-selection"));

  // Same path scheme as comments posted from the site.
  const path = `${story.path}.${String(story.id).padStart(6, "0")}.${Date.now() % 1000000}`;
  const reply = await prisma.item.create({
    data: {
      type: "comment",
      text: `@${original.author.username} ${text}`,
      authorId: admin.userId,
      parentId: story.id,
      path,
      depth: story.path.split(".").length,
      points: 1,
      status: "published",
    },
    select: { id: true },
  });

  // Replying to a held comment approves it, as in WordPress.
  await prisma.item.updateMany({ where: { id, status: "pending" }, data: { status: "published" } });
  await recountComments([story.id]);
  await logActivity(admin.userId, "comments.reply", `Réponse au commentaire #${id}`, { type: "comment", id: reply.id });
  revalidatePath("/", "layout");
  redirect(withNotice(back, "replied"));
}
