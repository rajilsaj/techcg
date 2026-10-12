import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { listStories, type StoryOrder } from "@/lib/stories";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StoryList, nextPageHref, pageNumber } from "./StoryList";

export interface StoryListPageProps {
  title: string;
  pathname: string;
  where: Prisma.ItemWhereInput;
  order: StoryOrder;
  searchParams: Promise<Record<string, string | undefined>>;
  emptyText?: string;
}

/** A section page (Récents, Questions…): header, title and a paginated story list. */
export async function StoryListPage({ title, pathname, where, order, searchParams, emptyText }: StoryListPageProps) {
  const params = await searchParams;
  const session = await getSession();
  const page = pageNumber(params.page);

  const { stories, nextCursor } = await listStories({
    where,
    order,
    cursor: params.cursor,
    viewerId: session?.userId,
  });

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader title={title} />
        <StoryList
          stories={stories}
          isLoggedIn={!!session}
          page={page}
          nextHref={nextPageHref(pathname, nextCursor, page)}
          emptyText={emptyText}
        />
      </div>
    </>
  );
}
