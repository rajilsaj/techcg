import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { daily, ipTable, overview, top, topReferrers, type Period } from "@/lib/analytics/stats";
import { DEVICE_LABELS, countryName, flag, formatDuration, placeLabel } from "@/lib/analytics/format";
import { formatLocalDateTime } from "@/lib/local-time";
import { formatRelativeTime } from "@/i18n";
import { AdminHeader, AdminPagination, Card, SearchForm, StatusTabs, adminHref, tdClass, thClass } from "@/components/admin/ui";
import { DailyBars, DataTable, RankedBars } from "@/components/indicators/charts";

export const dynamic = "force-dynamic";

const PERIODS: Record<string, { days: number; label: string }> = {
  "1": { days: 1, label: "Aujourd'hui" },
  "7": { days: 7, label: "7 jours" },
  "30": { days: 30, label: "30 jours" },
  "90": { days: 90, label: "90 jours" },
};
const PER_PAGE = 50;
const fr = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-text">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

export default async function VisitorsPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/visiteurs");
  const params = await searchParams;
  const periodKey = params.periode && params.periode in PERIODS ? params.periode : "30";
  const period: Period = { days: PERIODS[periodKey].days, includeBots: params.robots === "1" };
  const q = params.q?.trim() || undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [stats, days, pages, referrers, countries, cities, browsers, systems, devices, screens, languages, ips, settings] = await Promise.all([
    overview(period),
    daily({ ...period, days: Math.max(period.days, 7) }),
    top(period, "path", 10),
    topReferrers(period),
    top(period, "country"),
    top(period, "city"),
    top(period, "browser"),
    top(period, "os"),
    top(period, "device"),
    top(period, "screen", 6),
    top(period, "language", 6),
    ipTable(period, page, PER_PAGE, q),
    getSettings(),
  ]);

  const filters = { periode: periodKey, robots: period.includeBots ? "1" : undefined, q };
  const href = (overrides: Record<string, string | number | undefined>) => adminHref("/godmod/visiteurs", { ...filters, ...overrides });
  const ranked = (rows: { value: string; views: number }[], label: (v: string) => React.ReactNode = (v) => v) =>
    rows.map((r) => ({ key: r.value, value: r.views, label: label(r.value) }));

  return (
    <>
      <AdminHeader
        title="Visiteurs"
        description={`Chaque visite des pages publiques, avec l'adresse IP et sa localisation. Données conservées ${settings.analyticsRetentionDays} jours.`}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <StatusTabs active={periodKey} hrefFor={(key) => href({ periode: key, page: undefined })} tabs={Object.entries(PERIODS).map(([key, p]) => ({ key, label: p.label }))} />
        <Link href={href({ robots: period.includeBots ? undefined : "1", page: undefined })} className="text-sm text-accent hover:underline">
          {period.includeBots ? "Exclure les robots" : "Inclure les robots"}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="En ligne" value={fr.format(stats.onlineNow)} hint="visiteurs ces 5 dernières minutes" />
        <Tile label="Pages vues" value={fr.format(stats.views)} />
        <Tile label="Visiteurs uniques" value={fr.format(stats.visitors)} hint={`${fr.format(stats.ips)} adresse${stats.ips > 1 ? "s" : ""} IP`} />
        <Tile label="Visites" value={fr.format(stats.sessions)} hint={stats.sessions ? `${fr.format(stats.views / stats.sessions)} pages par visite` : undefined} />
        <Tile label="Temps moyen par page" value={formatDuration(stats.avgDurationMs)} />
        <Tile label="Visites d'une seule page" value={stats.bounceRate === null ? "—" : `${fr.format(stats.bounceRate * 100)} %`} hint="taux de rebond" />
      </div>

      <div className="mt-4">
        <Card title="Pages vues par jour">
          <DailyBars data={days} />
          <DataTable
            caption="Pages vues et visiteurs uniques par jour"
            head={["Jour", "Pages vues", "Visiteurs uniques"]}
            rows={days.map((d) => [d.day, d.count, d.visitors])}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Pages les plus vues">
          <RankedBars empty="Aucune visite." items={ranked(pages, (path) => <Link href={path} className="text-text hover:text-accent">{path}</Link>)} />
        </Card>
        <Card title="Sites référents">
          <RankedBars empty="Aucun site référent (accès directs)." items={ranked(referrers)} />
        </Card>
        <Card title="Pays">
          <RankedBars empty="Aucune donnée." items={ranked(countries, (c) => `${flag(c)} ${countryName(c)}`)} />
        </Card>
        <Card title="Villes">
          <RankedBars empty="Aucune donnée." items={ranked(cities)} />
        </Card>
        <Card title="Navigateurs">
          <RankedBars empty="Aucune donnée." items={ranked(browsers)} />
        </Card>
        <Card title="Systèmes">
          <RankedBars empty="Aucune donnée." items={ranked(systems)} />
        </Card>
        <Card title="Appareils">
          <RankedBars empty="Aucune donnée." items={ranked(devices, (d) => DEVICE_LABELS[d] ?? d)} />
        </Card>
        <Card title="Écrans">
          <RankedBars empty="Aucune donnée." items={ranked(screens)} />
        </Card>
        <Card title="Langues">
          <RankedBars empty="Aucune donnée." items={ranked(languages)} />
        </Card>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">Adresses IP</h2>
            <p className="text-sm text-text-secondary">Une ligne par adresse, la plus récente en premier. Cliquez pour le détail complet.</p>
          </div>
          <SearchForm action="/godmod/visiteurs" query={q} keep={{ periode: periodKey, robots: filters.robots }} placeholder="IP, ville ou code pays…" />
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-bg">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Adresse IP</th>
                <th className={thClass}>Localisation</th>
                <th className={thClass}>Appareil</th>
                <th className={`${thClass} text-right`}>Pages</th>
                <th className={`${thClass} text-right`}>Visites</th>
                <th className={thClass}>Première visite</th>
                <th className={thClass}>Dernière visite</th>
              </tr>
            </thead>
            <tbody>
              {ips.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${tdClass} py-10 text-center text-text-secondary`}>
                    Aucune visite enregistrée sur cette période.
                  </td>
                </tr>
              )}
              {ips.rows.map((r) => (
                <tr key={r.ip} className="hover:bg-bg-secondary/60">
                  <td className={tdClass}>
                    <Link href={`/godmod/visiteurs/ip/${encodeURIComponent(r.ip)}`} className="font-mono text-sm font-medium text-accent hover:underline">
                      {r.ip}
                    </Link>
                    {r.isBot && <span className="ml-2 rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] uppercase text-text-secondary">robot</span>}
                    {r.usernames.length > 0 && <div className="text-xs text-text-secondary">membre : {r.usernames.join(", ")}</div>}
                  </td>
                  <td className={tdClass}>
                    {flag(r.country)} {placeLabel(r.city, r.region, r.country)}
                  </td>
                  <td className={`${tdClass} text-xs text-text-secondary`}>
                    {[r.browser, r.os].filter(Boolean).join(" · ") || "—"}
                    <div>{DEVICE_LABELS[r.device] ?? r.device}{r.visitors > 1 && ` · ${r.visitors} navigateurs`}</div>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{r.views}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{r.sessions}</td>
                  <td className={`${tdClass} whitespace-nowrap text-xs text-text-secondary`}>{formatLocalDateTime(r.firstSeen)}</td>
                  <td className={`${tdClass} whitespace-nowrap text-xs`}>
                    {formatLocalDateTime(r.lastSeen)}
                    <div className="text-text-secondary">{formatRelativeTime(r.lastSeen)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} pageCount={Math.ceil(ips.total / PER_PAGE)} total={ips.total} hrefFor={(p) => href({ page: p })} />
      </section>
    </>
  );
}
