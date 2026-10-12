"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { backTo, requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { isItemStatus, STATUS_LABELS } from "@/lib/content-status";
import { fromLocalInput } from "@/lib/local-time";
import { calculateRankScore } from "@/lib/ranking";
import { parseTagNames, setItemTags } from "@/lib/taxonomy";

const POST_TYPES = ["story", "ask", "show", "job"];

function selectedIds(formData: FormData): number[] {
  return formData
    .getAll("ids")
    .map((v) => parseInt(String(v), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function refreshPublicPages() {
  revalidatePath("/", "layout");
}

/** Bulk actions from the articles list. */
export async function bulkArticlesAction(formData: FormData) {
  const admin = await requireAdminAction();
  const back = backTo(formData, "/godmod/articles");
  const ids = selectedIds(formData);
  const action = String(formData.get("bulk") ?? "");
  if (ids.length === 0 || !action) redirect(withNotice(back, "no-selection"));

  const where = { id: { in: ids }, type: { in: POST_TYPES } };
  let notice = "updated";

  switch (action) {
    case "published":
    case "draft":
    case "pending":
      await prisma.item.updateMany({ where, data: { status: action } });
      break;
    case "trash":
      await prisma.item.updateMany({ where, data: { status: "trash" } });
      notice = "trashed";
      break;
    case "restore":
      await prisma.item.updateMany({ where: { ...where, status: "trash" }, data: { status: "published" } });
      notice = "restored";
      break;
    case "delete":
      // Permanent deletion only from the trash, like WordPress.
      await prisma.item.deleteMany({ where: { ...where, status: "trash" } });
      notice = "deleted";
      break;
    default:
      redirect(withNotice(back, "no-selection"));
  }

  const label = { published: "publié", draft: "mis en brouillon", pending: "mis en attente", trash: "mis à la corbeille", restore: "restauré", delete: "supprimé définitivement" }[action];
  await logActivity(admin.userId, `articles.${action}`, `${ids.length} article(s) ${label}`, { type: "item" });
  refreshPublicPages();
  revalidatePath("/godmod", "layout");
  redirect(withNotice(back, notice));
}

/** Save from the article edit screen. */
export async function updateArticleAction(formData: FormData) {
  const admin = await requireAdminAction();
  const id = parseInt(String(formData.get("id")), 10);
  const back = `/godmod/articles/${id}`;

  const item = await prisma.item.findUnique({ where: { id }, select: { id: true, type: true, points: true, createdAt: true } });
  if (!item || !POST_TYPES.includes(item.type)) redirect("/godmod/articles");

  const text = (name: string, max: number) => {
    const value = String(formData.get(name) ?? "").trim();
    return value ? value.slice(0, max) : null;
  };
  const url = text("url", 2000);
  if (url) {
    try {
      new URL(url);
    } catch {
      redirect(withNotice(back, "invalid-url"));
    }
  }

  const statusValue = String(formData.get("status") ?? "");
  const status = isItemStatus(statusValue) ? statusValue : "published";
  const publishAt = status === "scheduled" ? fromLocalInput(formData.get("publishAt")) : null;
  const categoryId = parseInt(String(formData.get("categoryId") ?? ""), 10);
  const type = String(formData.get("type") ?? item.type);

  // A scheduled article takes its publication date as its date, like WordPress.
  const createdAt = status === "scheduled" && publishAt ? publishAt : item.createdAt;

  await prisma.item.update({
    where: { id },
    data: {
      title: text("title", 500) ?? "Sans titre",
      url,
      text: text("text", 20000),
      excerpt: text("excerpt", 1000),
      excerptLang: text("excerpt", 1000) ? "fr" : null,
      imageUrl: text("imageUrl", 2000),
      type: POST_TYPES.includes(type) ? type : item.type,
      status: status === "scheduled" && !publishAt ? "draft" : status,
      publishAt,
      createdAt,
      rankScore: calculateRankScore(item.points, createdAt),
      categoryId: Number.isInteger(categoryId) ? categoryId : null,
    },
  });
  await setItemTags(id, parseTagNames(String(formData.get("tags") ?? "")));

  await logActivity(admin.userId, "articles.update", `Article #${id} modifié (${STATUS_LABELS[status]})`, { type: "item", id });
  refreshPublicPages();
  revalidatePath("/godmod", "layout");
  redirect(withNotice(back, "saved"));
}

/** Clears the reports on an article. */
export async function clearFlagsAction(formData: FormData) {
  const admin = await requireAdminAction();
  const id = parseInt(String(formData.get("id")), 10);
  await prisma.item.update({ where: { id }, data: { flagCount: 0 } });
  await logActivity(admin.userId, "articles.clearFlags", `Signalements effacés sur l'article #${id}`, { type: "item", id });
  revalidatePath("/godmod", "layout");
  redirect(withNotice(`/godmod/articles/${id}`, "saved"));
}
