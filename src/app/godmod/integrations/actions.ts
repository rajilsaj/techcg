"use server";

import { redirect } from "next/navigation";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { checkSerpApiKey, getSerpApiKey, looksLikeSerpApiKey, saveSerpApiKey, saveSerpApiStatus } from "@/lib/serpapi";
import { googleNewsSourceUrl, isGoogleNewsSource } from "@/lib/importer/google-news";
import { isTopic } from "@/lib/topic-list";
import { NEWS_COUNTRIES, NEWS_LANGUAGES, MAX_SUBJECTS, isSiteSearch, subjectOf } from "./subjects";

const PAGE = "/godmod/integrations";

/** "Enregistrer et vérifier": stores the key (encrypted) and checks it with SerpApi. */
export async function saveSerpApiKeyAction(formData: FormData) {
  const admin = await requireAdminAction();
  const key = String(formData.get("apiKey") ?? "").trim();
  if (!looksLikeSerpApiKey(key)) redirect(withNotice(PAGE, "serpapi-format"));

  const status = await checkSerpApiKey(key);
  // A key SerpApi refuses is not kept; one that is valid but out of searches is.
  if (!status.ok && !status.message.startsWith("Clé valide")) {
    redirect(withNotice(PAGE, "serpapi-refused"));
  }
  await saveSerpApiKey(key);
  await saveSerpApiStatus(status);
  await logActivity(admin.userId, "settings.update", "Clé SerpApi enregistrée", { type: "settings" });
  redirect(withNotice(PAGE, status.ok ? "serpapi-ok" : "serpapi-empty"));
}

/** "Vérifier la connexion": checks the key in use again. */
export async function checkSerpApiAction() {
  await requireAdminAction();
  const key = await getSerpApiKey();
  if (!key) redirect(withNotice(PAGE, "serpapi-missing"));
  const status = await checkSerpApiKey(key);
  await saveSerpApiStatus(status);
  redirect(withNotice(PAGE, status.ok ? "serpapi-ok" : "serpapi-failed"));
}

export async function removeSerpApiKeyAction() {
  const admin = await requireAdminAction();
  await saveSerpApiKey(null);
  await logActivity(admin.userId, "settings.update", "Clé SerpApi supprimée", { type: "settings" });
  redirect(withNotice(PAGE, "serpapi-removed"));
}

/**
 * "Enregistrer les sujets": one Google News import source per subject (3 at most).
 * Sources whose subject was removed are deleted; their articles stay.
 */
export async function saveSubjectsAction(formData: FormData) {
  const admin = await requireAdminAction();
  const gl = String(formData.get("gl") ?? "");
  const hl = String(formData.get("hl") ?? "");
  const country = NEWS_COUNTRIES.find((c) => c.code === gl)?.code ?? "cg";
  const language = NEWS_LANGUAGES.find((l) => l.code === hl)?.code ?? "fr";
  const maxItems = Math.min(Math.max(parseInt(String(formData.get("maxItems") ?? "10"), 10) || 10, 1), 30);

  const wanted: { subject: string; topic: string | null }[] = [];
  for (let i = 0; i < MAX_SUBJECTS; i++) {
    const subject = String(formData.get(`subject-${i}`) ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
    const topic = String(formData.get(`topic-${i}`) ?? "");
    if (subject && !wanted.some((w) => w.subject.toLowerCase() === subject.toLowerCase())) {
      wanted.push({ subject, topic: isTopic(topic) ? topic : null });
    }
  }

  // Site searches ("site:techpoint.africa", set up in Importation) are not subjects: never updated or deleted here.
  const existing = (await prisma.importSource.findMany({ select: { id: true, url: true } })).filter((s) => isGoogleNewsSource(s.url) && !isSiteSearch(s.url));
  const bySubject = new Map(existing.map((s) => [subjectOf(s.url).toLowerCase(), s.id]));

  for (const { subject, topic } of wanted) {
    const data = {
      name: `Google News : ${subject}`.slice(0, 80),
      // when:7d keeps results to the last week (the import sorts them newest first).
      url: googleNewsSourceUrl({ q: `${subject} when:7d`, gl: country, hl: language }),
      maxItems,
      topic,
      enabled: true,
      // The subjects are already tech searches: keep their results (the fallback meta applies).
      strict: false,
    };
    const id = bySubject.get(subject.toLowerCase());
    if (id) {
      await prisma.importSource.update({ where: { id }, data });
      bySubject.delete(subject.toLowerCase());
    } else {
      await prisma.importSource.create({ data });
    }
  }
  const removed = [...bySubject.values()];
  if (removed.length > 0) await prisma.importSource.deleteMany({ where: { id: { in: removed } } });

  await logActivity(
    admin.userId,
    "import.source",
    wanted.length > 0 ? `Sujets Google News : ${wanted.map((w) => w.subject).join(", ")}` : "Sujets Google News supprimés",
    { type: "settings" }
  );
  redirect(withNotice(PAGE, wanted.length > 0 ? "subjects-saved" : "subjects-none"));
}
