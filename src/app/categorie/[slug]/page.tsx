import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { listStories } from "@/lib/stories";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StoryList, nextPageHref, pageNumber } from "@/components/list/StoryList";
import { t } from "@/i18n";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

/** Stories in one category, newest first. */
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug }, select: { id: true, name: true, description: true } });
  if (!category) notFound();

  const query = await searchParams;
  const session = await getSession();
  const page = pageNumber(query.page);
  const { stories, nextCursor } = await listStories({
    where: { categoryId: category.id },
    order: "newest",
    cursor: query.cursor,
    viewerId: session?.userId,
  });

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader title={t("category.heading", { name: category.name })} />
        {category.description && <p className="pt-3 text-sm text-text-secondary">{category.description}</p>}
        <StoryList stories={stories} isLoggedIn={!!session} page={page} nextHref={nextPageHref(`/categorie/${slug}`, nextCursor, page)} />
      </div>
    </>
  );
}
