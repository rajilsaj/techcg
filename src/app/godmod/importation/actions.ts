"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { runImport } from "@/lib/importer/run";
import { reanalyzeStories } from "@/lib/scraper/reanalyze";
import { normalizeUrl } from "@/lib/link-preview";
import { cleanGoogleNewsUrl, isGoogleNewsSource } from "@/lib/importer/google-news";

const PAGE = "/godmod/importation";

/** "Importer maintenant": one source ("run" = id) or every enabled source ("run" = "all"). */
export async function runImportAction(formData: FormData) {
  const admin = await requireAdminAction();
  const target = String(formData.get("run") ?? "");
  const sources =
    target === "all"
      ? await prisma.importSource.findMany({ where: { enabled: true }, select: { id: true, name: true } })
      : await prisma.importSource.findMany({ where: { id: parseInt(target, 10) || -1 }, select: { id: true, name: true } });
  if (sources.length === 0) redirect(withNotice(PAGE, "no-selection"));

  let created = 0;
  for (const source of sources) {
    const result = await runImport(source.id);
    created += result.created;
    await logActivity(admin.userId, "import.run", `Import ${source.name} : ${result.message}`, { type: "item" });
  }

  revalidatePath("/", "layout");
  redirect(withNotice(PAGE, created > 0 ? "imported" : "import-done"));
}

function sourceFields(formData: FormData, suffix = "") {
  const name = String(formData.get(`name${suffix}`) ?? "").trim().slice(0, 80);
  const typed = normalizeUrl(String(formData.get(`url${suffix}`) ?? ""))?.toString() ?? null;
  // A Google News search pasted with its api_key: keep the search, never the key.
  const url = typed && isGoogleNewsSource(typed) ? cleanGoogleNewsUrl(typed) : typed;
  const maxItems = Math.min(Math.max(parseInt(String(formData.get(`maxItems${suffix}`) ?? "20"), 10) || 20, 1), 100);
  const categoryId = parseInt(String(formData.get(`categoryId${suffix}`) ?? ""), 10);
  return {
    name,
    url,
    maxItems,
    categoryId: Number.isInteger(categoryId) ? categoryId : null,
    enabled: formData.get(`enabled${suffix}`) === "on",
    strict: formData.get(`strict${suffix}`) === "on",
  };
}

/** The public card on /sources (edit form only). Empty fields are filled again from the site's homepage. */
function cardFields(formData: FormData, suffix: string) {
  const text = (name: string, max: number) => String(formData.get(`${name}${suffix}`) ?? "").replace(/\s+/g, " ").trim().slice(0, max) || null;
  const logo = text("logoUrl", 500);
  return {
    siteName: text("siteName", 80),
    description: text("description", 280),
    logoUrl: logo && /^https?:\/\//i.test(logo) ? logo : null,
    country: text("country", 40),
  };
}

export async function createSourceAction(formData: FormData) {
  const admin = await requireAdminAction();
  const { url, ...fields } = sourceFields(formData);
  if (!fields.name) redirect(withNotice(PAGE, "name-required"));
  if (!url) redirect(withNotice(PAGE, "invalid-url"));
  const source = await prisma.importSource.create({ data: { ...fields, url, enabled: true }, select: { id: true } });
  await logActivity(admin.userId, "import.source", `Source d'import « ${fields.name} » ajoutée`, { type: "settings", id: source.id });
  redirect(withNotice(PAGE, "created"));
}

/** Saves the inline edit of row `editId` (fields suffixed with "-<id>"). */
export async function updateSourceAction(formData: FormData) {
  const admin = await requireAdminAction();
  const id = parseInt(String(formData.get("editId")), 10);
  const { url, ...fields } = sourceFields(formData, `-${id}`);
  if (!fields.name) redirect(withNotice(PAGE, "name-required"));
  if (!url) redirect(withNotice(PAGE, "invalid-url"));
  await prisma.importSource.update({ where: { id }, data: { ...fields, ...cardFields(formData, `-${id}`), url } });
  revalidatePath("/sources");
  await logActivity(admin.userId, "import.source", `Source d'import « ${fields.name} » modifiée`, { type: "settings", id });
  redirect(withNotice(PAGE, "saved"));
}

/** Deletes a source. Articles already imported stay. */
export async function deleteSourceAction(formData: FormData) {
  const admin = await requireAdminAction();
  const id = parseInt(String(formData.get("deleteId")), 10);
  const source = await prisma.importSource.delete({ where: { id }, select: { name: true } });
  await logActivity(admin.userId, "import.source", `Source d'import « ${source.name} » supprimée`, { type: "settings", id });
  redirect(withNotice(PAGE, "deleted"));
}

/** "Analyser les articles": advanced scraper on stories not analysed yet (pictures, reading time). */
export async function reanalyzeAction() {
  const admin = await requireAdminAction();
  const r = await reanalyzeStories(200_000);
  const summary = `${r.analyzed} article(s) analysé(s) : ${r.improved} image(s) remplacée(s) par une plus grande, ${r.removed} trop petite(s) remplacée(s) par l'illustration du sujet. Reste ${r.remaining} à analyser.`;
  await logActivity(admin.userId, "import.analyze", summary, { type: "item" });
  revalidatePath("/", "layout");
  redirect(`${PAGE}?${new URLSearchParams({ notice: "analyzed", rapport: summary })}`);
}

/** Removes the fake demo members (…@demo.invalid) and, by cascade, their articles. */
export async function removeDemoAction() {
  const admin = await requireAdminAction();
  const { count } = await prisma.user.deleteMany({ where: { email: { endsWith: "@demo.invalid" } } });
  await logActivity(admin.userId, "import.demo", `Données de démonstration supprimées (${count} comptes et leurs articles)`, { type: "settings" });
  revalidatePath("/", "layout");
  redirect(withNotice(PAGE, "demo-removed"));
}
