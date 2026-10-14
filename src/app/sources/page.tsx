import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { HOME_STORIES } from "@/lib/story-filters";
import { isGoogleNewsSource } from "@/lib/importer/google-news";
import { displayName, sourceCountry } from "@/lib/source-profile";
import { Header } from "@/components/layout/Header";
import { SourceLogo } from "@/components/sources/SourceLogo";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sources",
  description: "Les médias et sites tech d'Afrique et du monde que Tech.cg lit pour vous.",
};

/** Congo first, then RD Congo, the rest of Africa, then international sites. */
const COUNTRY_ORDER = ["Congo", "RD Congo", "RDC"];
const AFRICA = /congo|gabon|cameroun|angola|burundi|rwanda|afrique|côte|sénégal|nigeria|kenya|maroc|ghana|tanzanie|ouganda/i;

function rank(country: string | null): number {
  if (!country) return 3;
  const i = COUNTRY_ORDER.indexOf(country);
  if (i >= 0) return i === 0 ? 0 : 1;
  return AFRICA.test(country) ? 2 : 3;
}

export default async function SourcesPage() {
  const [rows, counts] = await Promise.all([
    prisma.importSource.findMany({
      where: { enabled: true },
      select: { id: true, name: true, url: true, siteName: true, description: true, logoUrl: true, country: true },
    }),
    prisma.item.groupBy({ by: ["importSourceId"], where: { ...HOME_STORIES, importSourceId: { not: null } }, _count: { _all: true } }),
  ]);
  const articles = new Map(counts.map((c) => [c.importSourceId, c._count._all]));

  const sources = rows
    .filter((s) => !isGoogleNewsSource(s.url))
    .map((s) => {
      const url = new URL(s.url);
      return {
        ...s,
        title: s.siteName ?? displayName(s.name),
        domain: url.hostname.replace(/^www\./, ""),
        home: url.origin,
        country: s.country ?? sourceCountry(s.name, s.url),
        articles: articles.get(s.id) ?? 0,
      };
    })
    .sort((a, b) => rank(a.country) - rank(b.country) || (a.country ?? "").localeCompare(b.country ?? "", "fr") || b.articles - a.articles);
  const countries = new Set(sources.map((s) => s.country).filter(Boolean)).size;

  return (
    <>
      <Header />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pt-12">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">{t("sources.kicker")}</p>
          <h1 className="mt-3 text-5xl font-medium leading-[0.92] tracking-tight text-text sm:text-7xl lg:text-8xl">
            {t("sources.title1")}
            <br />
            {t("sources.title2")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-text-secondary sm:text-base lg:text-lg">{t("sources.subtitle")}</p>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.15em] text-text-secondary">
            {t("sources.stats", { sources: sources.length, countries })}
          </p>
        </header>

        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => (
            <li key={s.id} className="group flex flex-col rounded-2xl border border-border bg-bg p-5 transition-colors hover:border-text-secondary/50">
              <div className="flex items-center gap-4">
                <SourceLogo src={s.logoUrl} name={s.title} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-text">{s.title}</h2>
                  <p className="truncate text-xs text-text-secondary">{s.domain}</p>
                </div>
              </div>

              {s.country && (
                <p className="mt-4">
                  <span className="inline-flex rounded-full bg-bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">{s.country}</span>
                </p>
              )}
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-text-secondary">{s.description ?? t("sources.noDescription")}</p>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
                {s.articles > 0 ? (
                  <Link href={`/site/${s.domain}`} className="font-medium text-text hover:text-accent">
                    {s.articles === 1 ? t("sources.article") : t("sources.articles", { count: s.articles })} →
                  </Link>
                ) : (
                  <span className="text-text-secondary">{t("sources.noArticles")}</span>
                )}
                <a
                  href={s.home}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-text-secondary hover:text-accent"
                  aria-label={t("sources.visit", { name: s.title })}
                >
                  {t("sources.site")} <ArrowUpRight size={14} aria-hidden />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
