import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listStories } from "@/lib/stories";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StoryList, pageNumber } from "@/components/list/StoryList";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

/** Days start at midnight Brazzaville time (UTC+1, no daylight saving). */
const UTC_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(time: number): string {
  return new Date(time + UTC_OFFSET_MS).toISOString().slice(0, 10);
}

function dayStart(key: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const time = Date.parse(`${key}T00:00:00Z`);
  return Number.isNaN(time) ? null : time - UTC_OFFSET_MS;
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ArchivesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();
  const page = pageNumber(params.page);

  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - DAY_MS);
  const requested = params.jour && params.jour < today ? params.jour : yesterday;
  const start = dayStart(requested) ?? dayStart(yesterday)!;
  const day = dayKey(start);

  const { stories, nextCursor } = await listStories({
    where: { type: "story", createdAt: { gte: new Date(start), lt: new Date(start + DAY_MS) } },
    order: "points",
    cursor: params.cursor,
    viewerId: session?.userId,
  });

  const previousDay = dayKey(start - DAY_MS);
  const nextDay = dayKey(start + DAY_MS);
  const label = new Date(start + UTC_OFFSET_MS).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader title={t("archives.heading")} showSubmit={false} />

        <div className="flex items-center justify-between gap-4 border-b border-border py-4 text-sm">
          <Link href={`/archives?jour=${previousDay}`} className="text-accent hover:underline">
            ← {t("archives.previousDay")}
          </Link>
          <span className="inline-block font-medium text-text first-letter:uppercase">{label}</span>
          {nextDay < today ? (
            <Link href={`/archives?jour=${nextDay}`} className="text-accent hover:underline">
              {t("archives.nextDay")} →
            </Link>
          ) : (
            <span aria-hidden className="w-24" />
          )}
        </div>

        <StoryList
          stories={stories}
          isLoggedIn={!!session}
          page={page}
          nextHref={
            nextCursor
              ? `/archives?${new URLSearchParams({ jour: day, cursor: nextCursor, page: String(page + 1) })}`
              : undefined
          }
          emptyText={t("archives.empty")}
        />
      </div>
    </>
  );
}
