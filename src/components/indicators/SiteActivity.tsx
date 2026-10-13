import Link from "next/link";
import type { SiteStats } from "@/lib/site-stats";
import { ChartCard, DailyBars, DataTable, RankedBars, StatTile } from "./charts";
import { t } from "@/i18n";

/** Community activity charts (admin "Statistiques" page). */
export function SiteActivity({ stats }: { stats: SiteStats }) {
  return (
    <section>

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
            {(stats.posts.total ? stats.comments.total / stats.posts.total : 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{t("indicators.site.engagementUnit")}</p>
        </ChartCard>
      </div>
    </section>
  );
}
