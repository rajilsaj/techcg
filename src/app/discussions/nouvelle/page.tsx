import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, Newspaper, PenLine } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { publiclyVisible } from "@/lib/content-status";
import { HOME_STORIES } from "@/lib/story-filters";
import { getDomain } from "@/lib/utils";
import { DiscussionsBar } from "@/components/discussions/DiscussionsBar";
import { NewDiscussionForm } from "@/components/discussions/NewDiscussionForm";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nouvelle discussion", robots: { index: false } };

export default async function NewDiscussionPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/discussions/nouvelle");
  const q = ((await searchParams).q ?? "").replace(/\s+/g, " ").trim().slice(0, 80);

  const articles = await prisma.item.findMany({
    where: {
      AND: [
        HOME_STORIES,
        publiclyVisible(),
        ...q.split(" ").filter(Boolean).slice(0, 6).map((word) => ({
          OR: [{ title: { contains: word, mode: "insensitive" as const } }, { originalTitle: { contains: word, mode: "insensitive" as const } }],
        })),
      ],
    },
    orderBy: { id: "desc" },
    take: 12,
    select: { id: true, title: true, url: true, commentCount: true },
  });

  return (
    <>
      <DiscussionsBar />
      <div className="px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:px-12 2xl:px-16">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">{t("discussions.newKicker")}</p>
          <h1 className="mt-3 text-4xl font-medium leading-[0.95] tracking-tight text-text sm:text-6xl">{t("discussions.newTitle")}</h1>
        </header>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 lg:grid-cols-2">
          {/* On an article */}
          <section aria-labelledby="on-article" className="flex flex-col rounded-2xl border border-border p-5">
            <h2 id="on-article" className="flex items-center gap-2 text-lg font-semibold text-text">
              <Newspaper size={18} aria-hidden className="text-accent" />
              {t("discussions.onArticle")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{t("discussions.onArticleHint")}</p>
            <form action="/discussions/nouvelle" method="get" role="search" className="mt-4 flex items-center gap-1 rounded-full bg-bg-secondary p-1 pl-4 focus-within:ring-2 focus-within:ring-accent/40">
              <label className="min-w-0 flex-1">
                <span className="sr-only">{t("discussions.searchArticle")}</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  maxLength={80}
                  placeholder={t("discussions.searchArticle")}
                  className="w-full border-0 bg-transparent py-1.5 text-sm text-text shadow-none placeholder:text-text-secondary/70 focus:outline-none focus:ring-0"
                />
              </label>
              <button type="submit" className="shrink-0 rounded-full bg-text px-4 py-2 text-sm font-medium text-bg hover:opacity-90">
                {t("discussions.search")}
              </button>
            </form>
            {articles.length === 0 ? (
              <p className="mt-6 text-center text-sm text-text-secondary">{t("discussions.noArticle")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {articles.map((a) => (
                  <li key={a.id}>
                    <Link href={`/discussions/${a.id}`} className="group flex items-center gap-3 py-3 hover:no-underline">
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium text-text group-hover:text-accent">{a.title ?? t("common.untitled")}</span>
                        {a.url && <span className="block truncate text-xs text-text-secondary">{getDomain(a.url)}</span>}
                      </span>
                      {a.commentCount > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-text-secondary">
                          <MessageCircle size={13} aria-hidden /> {a.commentCount}
                        </span>
                      )}
                      <span aria-hidden className="shrink-0 text-text-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-accent">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Free topic */}
          <section aria-labelledby="free-topic" className="flex flex-col rounded-2xl border border-border p-5 lg:self-start">
            <h2 id="free-topic" className="flex items-center gap-2 text-lg font-semibold text-text">
              <PenLine size={18} aria-hidden className="text-accent" />
              {t("discussions.free")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{t("discussions.freeHint")}</p>
            <NewDiscussionForm />
          </section>
        </div>
      </div>
    </>
  );
}
