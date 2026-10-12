"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/taxonomy";

type Kind = "category" | "tag";
const PATHS: Record<Kind, string> = { category: "/godmod/categories", tag: "/godmod/etiquettes" };
const NAMES: Record<Kind, string> = { category: "Catégorie", tag: "Étiquette" };

function fields(formData: FormData, suffix = "") {
  const name = String(formData.get(`name${suffix}`) ?? "").trim().slice(0, 60);
  const slug = slugify(String(formData.get(`slug${suffix}`) ?? "") || name);
  const description = String(formData.get(`description${suffix}`) ?? "").trim().slice(0, 500) || null;
  return { name, slug, description };
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

async function done(kind: Kind, adminId: number, action: string, summary: string, notice: string, id?: number) {
  await logActivity(adminId, `${kind}.${action}`, summary, { type: kind, id });
  revalidatePath("/", "layout");
  redirect(withNotice(PATHS[kind], notice));
}

export async function createTermAction(formData: FormData) {
  const admin = await requireAdminAction();
  const kind: Kind = formData.get("kind") === "tag" ? "tag" : "category";
  const { name, slug, description } = fields(formData);
  if (!name || !slug) redirect(withNotice(PATHS[kind], "name-required"));

  let id: number;
  try {
    id =
      kind === "category"
        ? (await prisma.category.create({ data: { name, slug, description }, select: { id: true } })).id
        : (await prisma.tag.create({ data: { name, slug }, select: { id: true } })).id;
  } catch (err) {
    if (isUniqueViolation(err)) redirect(withNotice(PATHS[kind], "slug-taken"));
    throw err;
  }
  await done(kind, admin.userId, "create", `${NAMES[kind]} « ${name} » créée`, "created", id);
}

/** Saves the inline edit of row `editId` (fields suffixed with "-<id>"). */
export async function updateTermAction(formData: FormData) {
  const admin = await requireAdminAction();
  const kind: Kind = formData.get("kind") === "tag" ? "tag" : "category";
  const id = parseInt(String(formData.get("editId")), 10);
  const { name, slug, description } = fields(formData, `-${id}`);
  if (!Number.isInteger(id) || !name || !slug) redirect(withNotice(PATHS[kind], "name-required"));

  try {
    if (kind === "category") await prisma.category.update({ where: { id }, data: { name, slug, description } });
    else await prisma.tag.update({ where: { id }, data: { name, slug } });
  } catch (err) {
    if (isUniqueViolation(err)) redirect(withNotice(PATHS[kind], "slug-taken"));
    throw err;
  }
  await done(kind, admin.userId, "update", `${NAMES[kind]} « ${name} » modifiée`, "saved", id);
}

/** Deletes row `deleteId`. Articles keep existing: they lose the category or tag. */
export async function deleteTermAction(formData: FormData) {
  const admin = await requireAdminAction();
  const kind: Kind = formData.get("kind") === "tag" ? "tag" : "category";
  const id = parseInt(String(formData.get("deleteId")), 10);
  if (!Number.isInteger(id)) redirect(withNotice(PATHS[kind], "no-selection"));

  const removed =
    kind === "category"
      ? await prisma.category.delete({ where: { id }, select: { name: true } })
      : await prisma.tag.delete({ where: { id }, select: { name: true } });
  await done(kind, admin.userId, "delete", `${NAMES[kind]} « ${removed.name} » supprimée`, "deleted");
}
