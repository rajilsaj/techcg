import { notFound } from "next/navigation";
import { HOME_STORIES } from "@/lib/story-filters";
import { getSession } from "@/lib/auth";
import { fromDomain, listStories } from "@/lib/stories";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StoryList, nextPageHref, pageNumber } from "@/components/list/StoryList";
import { t } from "@/i18n";

interface PageProps {
  params: Promise<{ domain: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

/** Every story linking to one website, newest first ("Historique" on a story). */
export default async function SitePage({ params, searchParams }: PageProps) {
  const domain = decodeURIComponent((await params).domain).toLowerCase().replace(/^www\./, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) notFound();

  const query = await searchParams;
  const session = await getSession();
  const page = pageNumber(query.page);

  const { stories, nextCursor } = await listStories({
    where: { AND: [HOME_STORIES, fromDomain(domain)] },
    order: "newest",
    cursor: query.cursor,
    viewerId: session?.userId,
  });

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader title={t("site.heading", { domain })} />
        <StoryList
          stories={stories}
          isLoggedIn={!!session}
          page={page}
          nextHref={nextPageHref(`/site/${domain}`, nextCursor, page)}
        />
      </div>
    </>
  );
}
