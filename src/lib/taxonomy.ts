import { prisma } from "./db";
import { AUTO_TAG_SLUGS, isAutoTag } from "./topics";

export const MAX_TAGS_PER_ITEM = 5;

/** "Énergie solaire" → "energie-solaire". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** "IA, cloud , ia,  5G" → ["IA", "cloud", "5G"]: trimmed, de-duplicated by slug, capped. */
export function parseTagNames(input: string | null | undefined): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of (input ?? "").split(",")) {
    const name = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    const slug = slugify(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    names.push(name);
    if (names.length >= MAX_TAGS_PER_ITEM) break;
  }
  return names;
}

/** Replaces an item's tags with `names`, creating tags that don't exist yet. */
/**
 * Sets a story's free tags. Meta tags and region (Startups, Tech, Congo…) are
 * managed separately (detection or the admin meta picker) and left untouched.
 */
export async function setItemTags(itemId: number, names: string[]): Promise<void> {
  const free = names.filter((name) => !isAutoTag(slugify(name)));
  const tags = await Promise.all(
    free.map((name) => {
      const slug = slugify(name);
      return prisma.tag.upsert({ where: { slug }, create: { name, slug }, update: {}, select: { id: true } });
    })
  );
  await prisma.$transaction([
    prisma.itemTag.deleteMany({ where: { itemId, tag: { slug: { notIn: AUTO_TAG_SLUGS } } } }),
    prisma.itemTag.createMany({ data: tags.map((tag) => ({ itemId, tagId: tag.id })), skipDuplicates: true }),
  ]);
}

/** Categories for select boxes, alphabetical. */
export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
}
