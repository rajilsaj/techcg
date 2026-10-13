import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { TOPICS } from "@/lib/topics";
import { filtersQuery, hasAdvancedFilters, hasFilters, PERIODS, SORT_PARAM, type StoryFilters } from "@/lib/story-filters";
import type { StoryOrder } from "@/lib/stories";
import { t, type Key } from "@/i18n";

const fieldClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-secondary/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const labelClass = "mb-1 block text-xs font-medium text-text-secondary";

function href(filters: StoryFilters, override: Partial<StoryFilters>): string {
  const query = filtersQuery(filters, override).toString();
  return query ? `/?${query}` : "/";
}

/**
 * Topic chips, a search box and an advanced search panel above the homepage feed.
 * A plain GET form: works without JavaScript and every result has a shareable URL.
 */
export function StoryFilterBar({ filters }: { filters: StoryFilters }) {
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
      active ? "border-accent bg-accent text-white" : "border-border text-text-secondary hover:border-accent hover:text-accent"
    }`;

  return (
    <section className="space-y-4 border-b border-border pb-4">
      <h1 className="pt-2 text-4xl font-extrabold leading-none tracking-tight text-accent sm:text-6xl">{t("home.headline")}</h1>

      <nav aria-label={t("filters.label")} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
        <Link href={href(filters, { topic: null })} className={chip(!filters.topic)} aria-current={!filters.topic ? "page" : undefined}>
          {t("filters.all")}
        </Link>
        {TOPICS.map((topic) => (
          <Link
            key={topic.slug}
            href={href(filters, { topic: topic.slug })}
            className={chip(filters.topic === topic.slug)}
            aria-current={filters.topic === topic.slug ? "page" : undefined}
          >
            {topic.label}
          </Link>
        ))}
      </nav>

      <form action="/" method="get" role="search" className="space-y-3">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{t("filters.search")}</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden />
            <input type="search" name="q" defaultValue={filters.q} maxLength={100} placeholder={t("filters.search")} className={`${fieldClass} pl-9`} />
          </label>
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            {t("filters.searchButton")}
          </button>
        </div>

        <details className="group rounded-md border border-border" open={hasAdvancedFilters(filters)}>
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-accent [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal size={15} aria-hidden />
            {t("filters.advanced")}
            <span className="ml-auto text-xs transition-transform group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </summary>

          <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className={labelClass}>{t("filters.topic")}</span>
              <select name="sujet" defaultValue={filters.topic ?? ""} className={fieldClass}>
                <option value="">{t("filters.anyTopic")}</option>
                {TOPICS.map((topic) => (
                  <option key={topic.slug} value={topic.slug}>
                    {topic.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>{t("filters.site")}</span>
              <input name="site" defaultValue={filters.site} maxLength={120} placeholder={t("filters.sitePlaceholder")} className={fieldClass} />
            </label>
            <label>
              <span className={labelClass}>{t("filters.author")}</span>
              <input name="auteur" defaultValue={filters.author} maxLength={40} placeholder={t("filters.authorPlaceholder")} className={fieldClass} />
            </label>
            <label>
              <span className={labelClass}>{t("filters.period")}</span>
              <select name="periode" defaultValue={filters.period ?? ""} className={fieldClass}>
                <option value="">{t("filters.anyPeriod")}</option>
                {Object.keys(PERIODS).map((period) => (
                  <option key={period} value={period}>
                    {t(`filters.period.${period}` as Key)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>{t("filters.sort")}</span>
              <select name="tri" defaultValue={SORT_PARAM[filters.sort]} className={fieldClass}>
                {(Object.keys(SORT_PARAM) as StoryOrder[]).map((sort) => (
                  <option key={sort} value={SORT_PARAM[sort]}>
                    {t(`filters.sort.${sort}` as Key)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                {t("filters.apply")}
              </button>
              <Link href="/" className="text-sm text-text-secondary hover:text-accent">
                {t("filters.reset")}
              </Link>
            </div>
          </div>
        </details>
      </form>

      {hasFilters(filters) && (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="font-medium text-text">{filters.q ? t("filters.resultsFor", { q: filters.q }) : t("filters.filtered")}</span>
          <Link href="/" className="inline-flex items-center gap-1 text-accent hover:underline">
            <X size={14} aria-hidden />
            {t("filters.reset")}
          </Link>
        </p>
      )}
    </section>
  );
}
