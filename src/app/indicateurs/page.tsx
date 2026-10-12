import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import {
  ChartCard,
  ComparisonBars,
  DailyBars,
  DataTable,
  RankedBars,
  StatTile,
  TrendLine,
  formatNumber,
} from "@/components/indicators/charts";
import { getSiteStats } from "@/lib/site-stats";
import { getCongoInternetTrend, getCountryIndicators } from "@/lib/worldbank";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: t("indicators.heading") };

export default async function IndicatorsPage() {
  const [stats, countries, trend] = await Promise.all([getSiteStats(), getCountryIndicators(), getCongoInternetTrend()]);

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4 pb-16">
        <SectionHeader title={t("indicators.heading")} showSubmit={false} />

        {/* Site activity */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-text">{t("indicators.site.heading")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t("indicators.site.subtitle")}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={t("indicators.site.members")} {...stats.members} />
            <StatTile label={t("indicators.site.posts")} {...stats.posts} />
            <StatTile label={t("indicators.site.comments")} {...stats.comments} />
            <StatTile label={t("indicators.site.likes")} {...stats.likes} />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <ChartCard title={t("indicators.site.daily")} subtitle={t("indicators.site.dailySubtitle")}>
                <DailyBars data={stats.dailyPosts} />
                <DataTable
                  caption={t("indicators.site.daily")}
                  head={["Jour", "Publications"]}
                  rows={stats.dailyPosts.map((d) => [d.day, d.count])}
                />
              </ChartCard>
            </div>
            <ChartCard title={t("indicators.site.domains")} subtitle={t("indicators.site.domainsSubtitle")}>
              <RankedBars
                empty={t("indicators.empty")}
                items={stats.topDomains.map((d) => ({
                  key: d.domain,
                  value: d.count,
                  label: (
                    <Link href={`/site/${d.domain}`} className="text-text hover:text-accent">
                      {d.domain}
                    </Link>
                  ),
                }))}
              />
            </ChartCard>
            <ChartCard title={t("indicators.site.active")} subtitle={t("indicators.site.activeSubtitle")}>
              <RankedBars
                empty={t("indicators.empty")}
                items={stats.activeMembers.map((m) => ({
                  key: m.username,
                  value: m.count,
                  label: (
                    <Link href={`/profil/${m.username}`} className="text-text hover:text-accent">
                      {m.username}
                    </Link>
                  ),
                }))}
              />
            </ChartCard>
            <ChartCard title={t("indicators.site.engagement")} subtitle={t("indicators.site.engagementSubtitle")}>
              <p className="text-4xl font-semibold tabular-nums text-text">
                {formatNumber(stats.posts.total ? stats.comments.total / stats.posts.total : 0)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{t("indicators.site.engagementUnit")}</p>
            </ChartCard>
          </div>
        </section>

        {/* Country tech indicators */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-text">{t("indicators.country.heading")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t("indicators.country.subtitle")}</p>

          {countries ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {countries.map((indicator) => {
                const values = indicator.values.map((v) => v.point?.value ?? 0);
                const max = indicator.percent ? 100 : Math.max(1, ...values) * 1.1;
                return (
                  <ChartCard key={indicator.code} title={indicator.label} subtitle={indicator.unit}>
                    <ComparisonBars
                      highlight="COG"
                      max={max}
                      suffix={indicator.percent ? " %" : ""}
                      rows={indicator.values.map((v) => ({
                        code: v.code,
                        name: v.name,
                        value: v.point?.value ?? null,
                        year: v.point?.year,
                      }))}
                    />
                  </ChartCard>
                );
              })}
              <div className="md:col-span-2">
                <ChartCard title={t("indicators.country.trend")} subtitle={t("indicators.country.trendSubtitle")}>
                  <TrendLine data={trend} unit="%" />
                  <DataTable
                    caption={t("indicators.country.trend")}
                    head={["Année", "% de la population"]}
                    rows={trend.map((d) => [d.year, formatNumber(d.value)])}
                  />
                </ChartCard>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-border p-5 text-sm text-text-secondary">
              {t("indicators.country.unavailable")}
            </p>
          )}

          <p className="mt-4 text-xs text-text-secondary">
            {t("indicators.country.source")}{" "}
            <a href="https://data.worldbank.org/" target="_blank" rel="noopener noreferrer" className="underline">
              data.worldbank.org
            </a>
          </p>
        </section>
      </div>
    </>
  );
}
