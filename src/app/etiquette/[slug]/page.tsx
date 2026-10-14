import { notFound } from "next/navigation";
import { HOME_STORIES } from "@/lib/story-filters";
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

/** Stories with one tag, newest first. */
export default async function TagPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!tag) notFound();

  const query = await searchParams;
  const session = await getSession();
  const page = pageNumber(query.page);
  const { stories, nextCursor } = await listStories({
    // Only startup, entrepreneur, tech and event stories, like the homepage.
    where: { AND: [HOME_STORIES, { tags: { some: { tagId: tag.id } } }] },
    order: "newest",
    cursor: query.cursor,
    viewerId: session?.userId,
  });

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader title={t("tag.heading", { name: tag.name })} />
        <StoryList stories={stories} isLoggedIn={!!session} page={page} nextHref={nextPageHref(`/etiquette/${slug}`, nextCursor, page)} />
      </div>
    </>
  );
}
