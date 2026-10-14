import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initialOf, LETTERS, parseProfileFilters, profileInitials, profilesWhere } from "@/lib/profiles";
import { Header } from "@/components/layout/Header";
import { ProfileList } from "@/components/profiles/ProfileList";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profiles.CG", description: "Les talents congolais de la tech : fondateurs, ingénieurs, créateurs." };

export default async function ProfilesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { letter, q } = parseProfileFilters(await searchParams);
  const [session, all] = await Promise.all([
    getSession(),
    prisma.profile.findMany({
      where: profilesWhere(q),
      orderBy: { name: "asc" },
      select: { slug: true, name: true, role: true, organization: true, photoUrl: true },
    }),
  ]);
  // Letters with at least one profile (for the current search) are clickable.
  const available = new Set(all.map((p) => initialOf(p.name)));
  const profiles = letter ? all.filter((p) => initialOf(p.name) === letter) : all;

  const href = (nextLetter: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextLetter) params.set("lettre", nextLetter);
    const query = params.toString();
    return query ? `/profils?${query}` : "/profils";
  };

  const letterClass = (on: boolean, enabled: boolean) =>
    `grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-2 text-sm tabular-nums transition-colors ${
      on ? "bg-text font-semibold text-bg" : enabled ? "text-text hover:bg-bg-secondary" : "cursor-default text-text-secondary/40"
    }`;

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:pt-16">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">{t("profiles.kicker")}</p>
          <h1 className="mt-3 text-5xl font-medium leading-[0.95] tracking-tight text-text sm:text-7xl">
            {t("profiles.title1")}
            <br />
            {t("profiles.title2")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm text-text-secondary sm:text-base">{t("profiles.subtitle")}</p>
        </header>

        <form
          action="/profils"
          method="get"
          role="search"
          className="mx-auto mt-10 flex max-w-xl items-center gap-1 rounded-full bg-bg-secondary p-1 pl-4 focus-within:ring-2 focus-within:ring-accent/40"
        >
          {letter && <input type="hidden" name="lettre" value={letter} />}
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("profiles.search")}</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={80}
              enterKeyHint="search"
              placeholder={t("profiles.searchPlaceholder")}
              className="w-full border-0 bg-transparent py-1.5 text-sm text-text shadow-none placeholder:text-text-secondary/70 focus:outline-none focus:ring-0"
            />
          </label>
          <button type="submit" className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            {t("profiles.search")}
          </button>
        </form>

        <nav aria-label={t("profiles.az")} className="scrollbar-none -mx-4 mt-6 flex gap-0.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
          <Link href={href(null)} aria-current={!letter ? "page" : undefined} className={letterClass(!letter, true)}>
            {t("profiles.all")}
          </Link>
          {LETTERS.map((l) =>
            available.has(l) ? (
              <Link key={l} href={href(l)} aria-current={letter === l ? "page" : undefined} className={letterClass(letter === l, true)}>
                {l}
              </Link>
            ) : (
              <span key={l} aria-disabled="true" className={letterClass(false, false)}>
                {l}
              </span>
            )
          )}
        </nav>

        <div className="mt-10">
          {profiles.length > 0 ? (
            <ProfileList
              profiles={profiles.map((p) => ({ slug: p.slug, name: p.name, role: p.role, organization: p.organization, photo: p.photoUrl, initials: profileInitials(p.name) }))}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <p className="text-text">{q || letter ? t("profiles.noResults") : t("profiles.empty")}</p>
              {(q || letter) && (
                <Link href="/profils" className="mt-2 inline-block text-sm text-accent hover:underline">
                  {t("profiles.reset")}
                </Link>
              )}
              {!q && !letter && session?.isAdmin && (
                <Link href="/godmod/profils" className="mt-2 inline-block text-sm text-accent hover:underline">
                  {t("profiles.addFirst")}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
