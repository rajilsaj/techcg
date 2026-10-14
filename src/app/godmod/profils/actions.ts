"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { profileFields } from "@/lib/profiles";

const PAGE = "/godmod/profils";

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export async function createProfileAction(formData: FormData) {
  const admin = await requireAdminAction();
  const data = profileFields(formData);
  if (!data.name || !data.slug) redirect(withNotice(PAGE, "name-required"));

  let id: number;
  try {
    id = (await prisma.profile.create({ data, select: { id: true } })).id;
  } catch (err) {
    if (isUniqueViolation(err)) redirect(withNotice(PAGE, "slug-taken"));
    throw err;
  }
  await logActivity(admin.userId, "profile.create", `Profil « ${data.name} » ajouté`, { type: "profile", id });
  revalidatePath("/profils");
  redirect(withNotice(PAGE, "created"));
}

export async function updateProfileAction(formData: FormData) {
  const admin = await requireAdminAction();
  const id = parseInt(String(formData.get("id")), 10);
  const data = profileFields(formData);
  const back = `${PAGE}/${id}`;
  if (!Number.isInteger(id)) redirect(PAGE);
  if (!data.name || !data.slug) redirect(withNotice(back, "name-required"));

  try {
    await prisma.profile.update({ where: { id }, data });
  } catch (err) {
    if (isUniqueViolation(err)) redirect(withNotice(back, "slug-taken"));
    throw err;
  }
  await logActivity(admin.userId, "profile.update", `Profil « ${data.name} » modifié`, { type: "profile", id });
  revalidatePath("/profils");
  revalidatePath(`/profils/${data.slug}`);
  redirect(withNotice(back, "saved"));
}

export async function deleteProfileAction(formData: FormData) {
  const admin = await requireAdminAction();
  const id = parseInt(String(formData.get("id")), 10);
  if (!Number.isInteger(id)) redirect(PAGE);
  const profile = await prisma.profile.findUnique({ where: { id }, select: { name: true } });
  if (profile) {
    await prisma.profile.delete({ where: { id } });
    await logActivity(admin.userId, "profile.delete", `Profil « ${profile.name} » supprimé`, { type: "profile", id });
  }
  revalidatePath("/profils");
  redirect(withNotice(PAGE, "deleted"));
}
