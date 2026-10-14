import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquarePlus, MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { HOME_STORIES } from "@/lib/story-filters";
import { publiclyVisible } from "@/lib/content-status";
import { LIVE_MS, listDiscussions, type DiscussionKind } from "@/lib/discussions";
import { getDomain } from "@/lib/utils";
import { DiscussionsBar, LiveDot } from "@/components/discussions/DiscussionsBar";
import { CoverImage } from "@/components/media/CoverImage";
import { TopicCover, coverTopic } from "@/components/media/TopicCover";
import { Avatar } from "@/components/user/Avatar";
import { formatRelativeTime, t } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "En discussion",
  description: "Les conversations de la communauté tech du Congo : réagissez aux articles du jour ou lancez votre sujet.",
};

const FILTERS: { key: DiscussionKind | null; label: string }[] = [
  { key: null, label: t("discussions.filter.all") },
  { key: "article", label: t("discussions.filter.article") },
  { key: "libre", label: t("discussions.filter.libre") },
];

export default async function DiscussionsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const kind: DiscussionKind | undefined = type === "article" || type === "libre" ? type : undefined;
  const discussions = await listDiscussions(kind);

  // Recent articles nobody talks about yet: one click starts the conversation.
  const suggestions =
    kind === "libre"
      ? []
      : await prisma.item.findMany({
          where: { AND: [HOME_STORIES, publiclyVisible(), { commentCount: 0 }, { id: { notIn: discussions.map((d) => d.id) } }] },
          orderBy: { id: "desc" },
          take: 6,
          select: { id: true, title: true, url: true },
        });

  const now = Date.now();

  return (
    <>
      <DiscussionsBar />
      <div className="px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:px-12 2xl:px-16">
        <header className="text-center">
          <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            <LiveDot />
            {t("discussions.kicker")}
          </p>
          <h1 className="mt-3 text-5xl font-medium leading-[0.92] tracking-tight text-text sm:text-7xl lg:text-8xl">
            {t("discussions.title1")}
            <br />
            {t("discussions.title2")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-text-secondary sm:text-base lg:text-lg">{t("discussions.subtitle")}</p>
          <Link
            href="/discussions/nouvelle"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:no-underline hover:opacity-90"
          >
            <MessageSquarePlus size={17} aria-hidden />
            {t("discussions.start")}
          </Link>
        </header>

        <nav aria-label={t("discussions.filter")} className="mt-12 flex justify-center">
          <ul className="flex items-center gap-1 rounded-full bg-bg-secondary p-1">
            {FILTERS.map((f) => {
              const on = (kind ?? null) === f.key;
              return (
                <li key={f.label}>
                  <Link
                    href={f.key ? `/discussions?type=${f.key}` : "/discussions"}
                    aria-current={on ? "page" : undefined}
                    className={`inline-flex h-9 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors hover:no-underline ${
                      on ? "bg-text text-bg shadow-sm" : "text-text-secondary hover:bg-bg hover:text-text"
                    }`}
                  >
                    {f.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {discussions.length === 0 ? (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-text-secondary">
            <MessagesSquare size={28} aria-hidden className="mx-auto mb-3 text-text-secondary/60" />
            {t("discussions.empty")}
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {discussions.map((d) => {
              const live = now - d.lastAt.getTime() < LIVE_MS;
              const topic = <TopicCover topic={coverTopic(d.tagSlugs, d.title)} className="h-14 w-14 shrink-0 rounded-xl" />;
              return (
                <li key={d.id}>
                  <Link
                    href={`/discussions/${d.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-bg p-5 transition-colors hover:border-text-secondary/50 hover:no-underline"
                  >
                    <div className="flex items-start gap-4">
                      {d.kind === "libre" ? (
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                          <MessagesSquare size={24} aria-hidden />
                        </span>
                      ) : d.imageUrl ? (
                        <CoverImage src={d.imageUrl} className="h-14 w-14 shrink-0 rounded-xl" fallback={topic} />
                      ) : (
                        topic
                      )}
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                          {t(`discussions.kind.${d.kind}`)}
                          {d.url && <span className="truncate normal-case tracking-normal">· {getDomain(d.url)}</span>}
                        </p>
                        <h2 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-text group-hover:text-accent">{d.title}</h2>
                      </div>
                    </div>

                    <div className="mt-4 flex-1">
                      {d.last ? (
                        <p className="line-clamp-3 rounded-2xl rounded-tl-sm bg-bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-text">
                          <span className="font-semibold">{d.last.username} : </span>
                          {d.last.text}
                        </p>
                      ) : (
                        <p className="text-sm italic text-text-secondary">{t("discussions.noMessage")}</p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-text-secondary">
                      <span className="flex items-center gap-2">
                        {d.participants.length > 0 && (
                          <span className="flex -space-x-2">
                            {d.participants.map((p) => (
                              <Avatar key={p.username} src={p.avatarUrl} size={22} className="ring-2 ring-bg" />
                            ))}
                          </span>
                        )}
                        <span className="tabular-nums">
                          {d.messages === 1 ? t("discussions.message") : t("discussions.messages", { count: d.messages })}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        {live && <LiveDot />}
                        {live ? t("discussions.live") : formatRelativeTime(d.lastAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {suggestions.length > 0 && (
          <section aria-labelledby="suggestions" className="mx-auto mt-16 max-w-5xl">
            <h2 id="suggestions" className="text-3xl font-extrabold tracking-tight text-text-secondary/35 sm:text-4xl">
              {t("discussions.suggestions")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{t("discussions.suggestionsHint")}</p>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {suggestions.map((s) => (
                <li key={s.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{s.title ?? t("common.untitled")}</p>
                    {s.url && <p className="truncate text-xs text-text-secondary">{getDomain(s.url)}</p>}
                  </div>
                  <Link
                    href={`/discussions/${s.id}`}
                    className="shrink-0 rounded-full bg-bg-secondary px-3.5 py-1.5 text-sm font-medium text-text hover:bg-accent/10 hover:text-accent hover:no-underline"
                  >
                    <span className="hidden sm:inline">{t("discussions.startOn")} </span>→
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
