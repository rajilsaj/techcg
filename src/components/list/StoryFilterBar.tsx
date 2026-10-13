import Link from "next/link";
import { X } from "lucide-react";
import { TOPICS } from "@/lib/topics";
import { filtersQuery, hasAdvancedFilters, hasFilters, PERIODS, SORT_PARAM, type StoryFilters } from "@/lib/story-filters";
import type { StoryOrder } from "@/lib/stories";
import { t, type Key } from "@/i18n";

const fieldClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-secondary/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const labelClass = "mb-1 block text-xs font-medium text-text-secondary";

function href(filters: StoryFilters, override: Partial<StoryFilters>): string {
  const query = filtersQuery(filters, override).toString();
  return query ? `/?${query}` : "/";
}

/**
 * One plain text bar above the homepage feed: categories, the search field, an
 * advanced search toggle and the search button. A plain GET form (the advanced panel opens
 * with a CSS-only checkbox), so it works without JavaScript and every result has a URL.
 */
export function StoryFilterBar({ filters }: { filters: StoryFilters }) {
  const pill = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
      active ? "bg-accent font-medium text-white" : "text-text-secondary hover:text-accent"
    }`;
  const advanced = hasAdvancedFilters(filters);

  return (
    <section className="space-y-4 border-b border-border pb-4">
      <h1 className="pt-2 text-4xl font-extrabold leading-none tracking-tight text-accent sm:text-6xl">{t("home.headline")}</h1>
      <form action="/" method="get" role="search">
        {/* Checked = advanced panel open. Kept first so the panel can use `peer-checked`. */}
        <input type="checkbox" id="advanced-search" className="peer sr-only" defaultChecked={advanced} />

        <div className="flex flex-col gap-1 rounded-3xl border border-border p-1 focus-within:border-accent/60 md:flex-row md:items-center md:rounded-full">
          <nav aria-label={t("filters.label")} className="scrollbar-none flex gap-1 overflow-x-auto">
            <Link href={href(filters, { topic: null })} className={pill(!filters.topic)} aria-current={!filters.topic ? "page" : undefined}>
              {t("filters.all")}
            </Link>
            {TOPICS.map((topic) => {
              const active = filters.topic === topic.slug;
              return (
                <Link key={topic.slug} href={href(filters, { topic: topic.slug })} className={pill(active)} aria-current={active ? "page" : undefined}>
                  {topic.label}
                </Link>
              );
            })}
          </nav>

          <span className="mx-2 hidden h-5 w-px bg-border md:block" aria-hidden />

          <div className="flex min-w-0 flex-1 items-center gap-1">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t("filters.search")}</span>
              <input
                type="search"
                name="q"
                defaultValue={filters.q}
                maxLength={100}
                placeholder={t("filters.search")}
                className="w-full border-0 bg-transparent px-3 py-1.5 text-sm text-text shadow-none placeholder:text-text-secondary/70 focus:outline-none focus:ring-0"
              />
            </label>
            <label
              htmlFor="advanced-search"
              className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors hover:text-accent ${advanced ? "text-accent" : "text-text-secondary"}`}
            >
              {t("filters.advancedShort")}
            </label>
            <button type="submit" className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
              {t("filters.searchButton")}
            </button>
          </div>
        </div>

        {/* Advanced search */}
        <div className="auth-view mt-2 hidden gap-3 rounded-2xl border border-border bg-bg-secondary p-3 peer-checked:grid sm:grid-cols-2 lg:grid-cols-5">
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
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
            <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              {t("filters.apply")}
            </button>
            <Link href="/" className="text-sm text-text-secondary hover:text-accent">
              {t("filters.reset")}
            </Link>
          </div>
        </div>
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
