import Link from "next/link";
import { X } from "lucide-react";
import { TOPICS } from "@/lib/topics";
import { filtersQuery, hasFilters, PERIODS, SORT_PARAM, type StoryFilters } from "@/lib/story-filters";
import type { StoryOrder } from "@/lib/stories";
import { t, type Key } from "@/i18n";
import { FilterForm, SentenceSelect } from "./FilterForm";

const fieldClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-secondary/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const labelClass = "mb-1 block text-xs font-medium text-text-secondary";

function href(filters: StoryFilters, override: Partial<StoryFilters>): string {
  const query = filtersQuery(filters, override).toString();
  return query ? `/?${query}` : "/";
}

/**
 * Homepage search and filters. The filters read as a French sentence whose blue
 * words are choices: « Afficher les articles sur [l'IA] publiés [ces 7 derniers
 * jours], [les plus récents] d'abord. » Site and author live under "Plus de
 * critères" (a CSS-only toggle) and show as removable tags once set.
 */
export function StoryFilterBar({ filters }: { filters: StoryFilters }) {
  const tags: { key: string; label: string; href: string }[] = [];
  if (filters.site) tags.push({ key: "site", label: t("filters.tag.site", { site: filters.site }), href: href(filters, { site: "" }) });
  if (filters.author) tags.push({ key: "author", label: t("filters.tag.author", { author: filters.author }), href: href(filters, { author: "" }) });

  return (
    <section className="space-y-4 border-b border-border pb-4">
      <h1 className="pt-2 text-4xl font-extrabold leading-none tracking-tight text-accent sm:text-6xl">{t("home.headline")}</h1>

      {/* Keyed by the filters so the choices reset when they change (e.g. "Tout effacer"). */}
      <FilterForm key={filtersQuery(filters).toString()} className="space-y-3">
        {filters.category && <input type="hidden" name="categorie" value={filters.category} />}

        <div className="flex items-center gap-1 rounded-full bg-bg-secondary p-1 pl-4 focus-within:ring-2 focus-within:ring-accent/40">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("filters.searchButton")}</span>
            <input
              type="search"
              name="q"
              enterKeyHint="search"
              defaultValue={filters.q}
              maxLength={100}
              placeholder={t("filters.search")}
              className="w-full border-0 bg-transparent py-1.5 text-sm text-text shadow-none placeholder:text-text-secondary/70 focus:outline-none focus:ring-0"
            />
          </label>
          <button type="submit" className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
            {t("filters.searchButton")}
          </button>
        </div>

        {/* Checked = "Plus de critères" open. Kept before the panel so the panel can use `peer-checked`. */}
        <input type="checkbox" id="more-criteria" className="peer sr-only" />

        <p className="text-[16px] leading-[1.9] text-text sm:text-xl">
          {t("filters.sentence.show")}{" "}
          <SentenceSelect
            name="sujet"
            label={t("filters.sentence.topicLabel")}
            defaultValue={filters.topic ?? ""}
            options={[
              { value: "", label: t("filters.sentence.topic.all") },
              ...TOPICS.map((topic) => ({ value: topic.slug, label: t(`filters.sentence.topic.${topic.slug}` as Key) })),
            ]}
          />{" "}
          {t("filters.sentence.published")}{" "}
          <SentenceSelect
            name="periode"
            label={t("filters.sentence.periodLabel")}
            defaultValue={filters.period ?? ""}
            options={[
              { value: "", label: t("filters.sentence.period.any") },
              ...Object.keys(PERIODS).map((period) => ({ value: period, label: t(`filters.sentence.period.${period}` as Key) })),
            ]}
          />
          ,{" "}
          <SentenceSelect
            name="tri"
            label={t("filters.sentence.sortLabel")}
            defaultValue={SORT_PARAM[filters.sort]}
            options={(Object.keys(SORT_PARAM) as StoryOrder[]).map((sort) => ({
              value: SORT_PARAM[sort],
              label: t(`filters.sentence.sort.${sort}` as Key),
            }))}
          />{" "}
          {t("filters.sentence.first")}{" "}
          <label htmlFor="more-criteria" className="cursor-pointer whitespace-nowrap text-sm text-text-secondary underline-offset-4 hover:text-accent hover:underline">
            {t("filters.more")}
          </label>
        </p>

        {/* Plus de critères */}
        <div className="auth-view hidden grid-cols-2 gap-3 rounded-2xl border border-border bg-bg-secondary p-3 peer-checked:grid sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="min-w-0">
            <span className={labelClass}>{t("filters.site")}</span>
            <input name="site" defaultValue={filters.site} maxLength={120} placeholder={t("filters.sitePlaceholder")} className={fieldClass} />
          </label>
          <label className="min-w-0">
            <span className={labelClass}>{t("filters.author")}</span>
            <input name="auteur" defaultValue={filters.author} maxLength={40} placeholder={t("filters.authorPlaceholder")} className={fieldClass} />
          </label>
          <button type="submit" className="col-span-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 sm:col-span-1">
            {t("filters.apply")}
          </button>
        </div>
      </FilterForm>

      {(tags.length > 0 || hasFilters(filters)) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          {filters.q && <span className="font-medium text-text">{t("filters.resultsFor", { q: filters.q })}</span>}
          {tags.map((tag) => (
            <Link
              key={tag.key}
              href={tag.href}
              aria-label={t("filters.tag.remove", { label: tag.label })}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 py-0.5 pl-3 pr-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              {tag.label}
              <X size={12} aria-hidden />
            </Link>
          ))}
          {hasFilters(filters) && (
            <Link href="/" className="text-xs text-text-secondary underline underline-offset-2 hover:text-accent">
              {t("filters.reset")}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
