"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { profileFields } from "@/lib/profiles";
import { slugify } from "@/lib/taxonomy";
import { extractProfile, type ProfileDraft } from "@/lib/profile-import";

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

/** "Remplir depuis un lien": reads a LinkedIn profile or website for the form (nothing is saved). */
export async function extractProfileAction(url: string): Promise<{ draft: ProfileDraft } | { error: string }> {
  await requireAdminAction();
  if (typeof url !== "string" || !url.trim() || url.length > 500) return { error: "Collez l'adresse d'un profil LinkedIn ou d'un site." };
  const result = await extractProfile(url);
  return result.ok ? { draft: result.draft } : { error: result.error };
}

/** A slug not used yet ("nelson-cishugi", "nelson-cishugi-2"…). */
async function freeSlug(name: string): Promise<string> {
  const base = slugify(name) || "profil";
  let slug = base;
  for (let n = 2; await prisma.profile.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
  return slug;
}

/** "Importer plusieurs profils": one LinkedIn or website address per line (10 at most). */
export async function importProfilesAction(formData: FormData) {
  const admin = await requireAdminAction();
  const urls = [...new Set(String(formData.get("urls") ?? "").split(/\s+/).map((u) => u.trim()).filter(Boolean))].slice(0, 10);
  if (urls.length === 0) redirect(withNotice(PAGE, "no-selection"));

  const report: string[] = [];
  let created = 0;
  for (const url of urls) {
    const result = await extractProfile(url);
    if (!result.ok) {
      report.push(`${url} : ${result.error}`);
      continue;
    }
    const d = result.draft;
    if (!d.name) {
      report.push(`${url} : aucun nom trouvé.`);
      continue;
    }
    // Same LinkedIn page or website already listed: skip.
    const existing = await prisma.profile.findFirst({
      where: { OR: [d.linkedin ? { linkedin: d.linkedin } : { id: -1 }, d.website ? { website: d.website } : { id: -1 }] },
      select: { name: true },
    });
    if (existing) {
      report.push(`${url} : déjà présent (${existing.name}).`);
      continue;
    }
    const profile = await prisma.profile.create({
      data: {
        name: d.name,
        slug: await freeSlug(d.name),
        role: d.role ?? "",
        organization: d.organization,
        city: d.city,
        country: d.country ?? "CG",
        photoUrl: d.photoUrl,
        bio: d.bio,
        website: d.website,
        linkedin: d.linkedin,
        published: true,
      },
      select: { id: true },
    });
    created++;
    report.push(`${url} : ${d.name} ajouté.`);
    await logActivity(admin.userId, "profile.import", `Profil « ${d.name} » importé depuis ${url}`, { type: "profile", id: profile.id });
  }

  revalidatePath("/profils");
  const params = new URLSearchParams({ notice: created > 0 ? "profiles-imported" : "profiles-none", rapport: report.join("\n").slice(0, 1500) });
  redirect(`${PAGE}?${params}`);
}
