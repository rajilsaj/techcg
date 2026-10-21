"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminAction } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { detectTopics, isRegion, isTopic, setAutoTags, type AutoTagSlug, type RegionSlug, type TopicSlug } from "@/lib/topics";

export interface MetaState {
  topics: TopicSlug[];
  region: RegionSlug | null;
  manual: boolean;
}

/** Reads a story's current meta tags and region from its tags. */
async function metaOf(itemId: number): Promise<MetaState> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { metaManual: true, tags: { select: { tag: { select: { slug: true } } } } },
  });
  const slugs = item?.tags.map((t) => t.tag.slug) ?? [];
  return {
    topics: slugs.filter(isTopic),
    region: slugs.find(isRegion) ?? null,
    manual: item?.metaManual ?? false,
  };
}

/** Meta picker: saves the admin's choice; detection won't change it afterwards. */
export async function saveMetaAction(itemId: number, topics: string[], region: string | null): Promise<MetaState | { error: string }> {
  const admin = await requireAdminAction();
  if (!Number.isInteger(itemId)) return { error: "Article introuvable." };
  const picked: AutoTagSlug[] = [...new Set(topics)].filter(isTopic);
  if (isRegion(region)) picked.push(region);

  const updated = await prisma.item.updateMany({ where: { id: itemId }, data: { metaManual: true } });
  if (updated.count === 0) return { error: "Article introuvable." };
  await setAutoTags(itemId, picked);
  await logActivity(admin.userId, "articles.meta", `Méta de l'article #${itemId} : ${picked.join(", ") || "aucune"}`, { type: "item", id: itemId });
  revalidatePath("/");
  return metaOf(itemId);
}

/** Back to automatic detection: recomputes the meta tags and region now. */
export async function resetMetaAction(itemId: number): Promise<MetaState | { error: string }> {
  await requireAdminAction();
  const item = Number.isInteger(itemId)
    ? await prisma.item.findUnique({
        where: { id: itemId },
        select: { title: true, originalTitle: true, excerpt: true, keywords: true, url: true, importSource: { select: { country: true } } },
      })
    : null;
  if (!item) return { error: "Article introuvable." };
  await prisma.item.update({ where: { id: itemId }, data: { metaManual: false } });
  await setAutoTags(
    itemId,
    detectTopics(
      { title: `${item.title} . ${item.originalTitle ?? ""}`, excerpt: item.excerpt, keywords: item.keywords, url: item.url },
      { sourceCountry: item.importSource?.country }
    )
  );
  revalidatePath("/");
  return metaOf(itemId);
}
