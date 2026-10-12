"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";

/** Saves the alt text of row `altId` (field "alt-<id>"). */
export async function updateMediaAltAction(formData: FormData) {
  const admin = await requireAdminAction();
  const id = parseInt(String(formData.get("altId")), 10);
  if (!Number.isInteger(id)) redirect(withNotice("/godmod/medias", "no-selection"));
  const alt = String(formData.get(`alt-${id}`) ?? "").trim().slice(0, 200);
  await prisma.media.update({ where: { id }, data: { alt } });
  await logActivity(admin.userId, "media.update", `Texte alternatif de l'image #${id} modifié`, { type: "media", id });
  revalidatePath("/godmod/medias");
  redirect(withNotice("/godmod/medias", "saved"));
}

/** Deletes row `deleteId` from Blob and from the library. Articles using its URL lose their image. */
export async function deleteMediaAction(formData: FormData) {
  const admin = await requireAdminAction();
  const id = parseInt(String(formData.get("deleteId")), 10);
  const media = Number.isInteger(id) ? await prisma.media.findUnique({ where: { id }, select: { url: true } }) : null;
  if (!media) redirect(withNotice("/godmod/medias", "no-selection"));

  await del(media.url);
  await prisma.$transaction([
    prisma.item.updateMany({ where: { imageUrl: media.url }, data: { imageUrl: null } }),
    prisma.media.delete({ where: { id } }),
  ]);
  await logActivity(admin.userId, "media.delete", `Image #${id} supprimée de la médiathèque`, { type: "media", id });
  revalidatePath("/", "layout");
  redirect(withNotice("/godmod/medias", "deleted"));
}
