import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import {
  ChartCard,
  ComparisonBars,
  DataTable,
  TrendLine,
  formatNumber,
} from "@/components/indicators/charts";
import { getCongoInternetTrend, getCountryIndicators } from "@/lib/worldbank";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: t("indicators.heading") };

export default async function IndicatorsPage() {
  const [countries, trend] = await Promise.all([getCountryIndicators(), getCongoInternetTrend()]);

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4 pb-16">
        <SectionHeader title={t("indicators.heading")} showSubmit={false} />

        {/* Country tech indicators */}
        <section className="mt-8">
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
