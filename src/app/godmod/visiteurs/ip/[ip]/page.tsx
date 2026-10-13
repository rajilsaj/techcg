import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { ipDetail } from "@/lib/analytics/stats";
import { DEVICE_LABELS, flag, formatDuration, placeLabel } from "@/lib/analytics/format";
import { formatLocalDateTime } from "@/lib/local-time";
import { SubmitButton } from "@/components/admin/FormControls";
import { AdminHeader, Card, buttonClass, tdClass, thClass } from "@/components/admin/ui";
import { deleteIpDataAction } from "../../actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ ip: string }>;
}

/** Distinct values of `key(item)`, in first-seen order, with how often each was seen. */
function distinct<T>(items: T[], key: (item: T) => string | null) {
  const counts = new Map<string, { item: T; count: number }>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    const entry = counts.get(k);
    if (entry) entry.count++;
    else counts.set(k, { item, count: 1 });
  }
  return [...counts.values()];
}

export default async function IpDetailPage({ params }: PageProps) {
  const ip = decodeURIComponent((await params).ip).slice(0, 64);
  await requireAdminPage(`/godmod/visiteurs/ip/${encodeURIComponent(ip)}`);
  const { views, total, users } = await ipDetail(ip);
  if (total === 0) notFound();

  const first = views[views.length - 1];
  const last = views[0];
  const sessions = new Set(views.map((v) => v.sessionId)).size;
  const browsers = new Set(views.map((v) => v.visitorId)).size;
  const places = distinct(views, (v) => `${v.city}|${v.region}|${v.country}|${v.latitude}|${v.longitude}`);
  const devices = distinct(views, (v) => `${v.browser} ${v.browserVer}|${v.os} ${v.osVer}|${v.device}|${v.screen}|${v.language}|${v.clientTz}`);
  const agents = distinct(views, (v) => v.userAgent || null);

  // Group the timeline by visit (session), newest visit first.
  const visits = distinct(views, (v) => v.sessionId).map(({ item }) => ({
    sessionId: item.sessionId,
    views: views.filter((v) => v.sessionId === item.sessionId),
  }));

  return (
    <>
      <AdminHeader
        title={`IP ${ip}`}
        description={`${flag(last.country)} ${placeLabel(last.city, last.region, last.country)}`}
        actions={
          <Link href="/godmod/visiteurs" className={buttonClass}>
            ← Tous les visiteurs
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Résumé">
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-text-secondary">Pages vues</dt>
            <dd className="text-right tabular-nums">{total}</dd>
            <dt className="text-text-secondary">Visites</dt>
            <dd className="text-right tabular-nums">{sessions}</dd>
            <dt className="text-text-secondary">Navigateurs (cookies)</dt>
            <dd className="text-right tabular-nums">{browsers}</dd>
            <dt className="text-text-secondary">Première visite</dt>
            <dd className="text-right">{formatLocalDateTime(first.createdAt)}</dd>
            <dt className="text-text-secondary">Dernière visite</dt>
            <dd className="text-right">{formatLocalDateTime(last.createdAt)}</dd>
            <dt className="text-text-secondary">Robot</dt>
            <dd className="text-right">{views.some((v) => v.isBot) ? "Oui" : "Non"}</dd>
            <dt className="text-text-secondary">Comptes membres</dt>
            <dd className="text-right">
              {users.length === 0
                ? "Aucun"
                : users.map((u, i) => (
                    <span key={u.id}>
                      {i > 0 && ", "}
                      <Link href={`/godmod/utilisateurs/${u.id}`} className="text-accent hover:underline">
                        {u.username}
                      </Link>
                    </span>
                  ))}
            </dd>
          </dl>
          {total > views.length && (
            <p className="mt-3 text-xs text-text-secondary">Les {views.length} pages vues les plus récentes sont détaillées ci-dessous.</p>
          )}
          <form action={deleteIpDataAction} className="mt-4">
            <input type="hidden" name="ip" value={ip} />
            <SubmitButton
              className={`${buttonClass} w-full border-red-500/50 text-red-500 hover:border-red-500 hover:text-red-500`}
              confirm={`Supprimer définitivement les ${total} pages vues enregistrées pour ${ip} ?`}
            >
              Supprimer les données de cette IP
            </SubmitButton>
          </form>
        </Card>

        <Card title="Localisations">
          <ul className="space-y-2 text-sm">
            {places.map(({ item: v, count }) => (
              <li key={`${v.city}${v.latitude}${v.longitude}`}>
                <p className="text-text">
                  {flag(v.country)} {placeLabel(v.city, v.region, v.country)}
                  <span className="text-text-secondary">
                    {" "}
                    · {count} vue{count > 1 ? "s" : ""}
                  </span>
                </p>
                <p className="text-xs text-text-secondary">
                  {v.postalCode && `Code postal ${v.postalCode} · `}
                  {v.timezone && `Fuseau ${v.timezone} · `}
                  {v.latitude !== null && v.longitude !== null ? (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${v.latitude}&mlon=${v.longitude}#map=11/${v.latitude}/${v.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)} (carte)
                    </a>
                  ) : (
                    "coordonnées inconnues"
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-text-secondary">Position approximative de l&apos;adresse IP (ville ou région), fournie par Vercel.</p>
        </Card>

        <Card title="Appareils">
          <ul className="space-y-2 text-sm">
            {devices.map(({ item: v, count }) => (
              <li key={`${v.browser}${v.browserVer}${v.os}${v.screen}${v.language}${v.clientTz}`}>
                <p className="text-text">
                  {[v.browser && `${v.browser} ${v.browserVer ?? ""}`.trim(), v.os && `${v.os} ${v.osVer ?? ""}`.trim()].filter(Boolean).join(" · ") || "Inconnu"}
                  <span className="text-text-secondary">
                    {" "}
                    · {count} vue{count > 1 ? "s" : ""}
                  </span>
                </p>
                <p className="text-xs text-text-secondary">
                  {DEVICE_LABELS[v.device] ?? v.device}
                  {v.screen && ` · écran ${v.screen}`}
                  {v.language && ` · ${v.language}`}
                  {v.clientTz && ` · ${v.clientTz}`}
                </p>
              </li>
            ))}
          </ul>
          <details className="mt-3 text-xs text-text-secondary">
            <summary className="cursor-pointer hover:text-text">User-agents complets ({agents.length})</summary>
            <ul className="mt-2 space-y-1 break-all font-mono">
              {agents.map(({ item: v }) => (
                <li key={v.userAgent}>{v.userAgent}</li>
              ))}
            </ul>
          </details>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-text">Chronologie des visites</h2>
      <div className="space-y-4">
        {visits.map((visit) => (
          <div key={visit.sessionId} className="overflow-x-auto rounded-xl border border-border bg-bg">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs text-text-secondary">
              <span>
                Visite du {formatLocalDateTime(visit.views[visit.views.length - 1].createdAt)} · {visit.views.length} page
                {visit.views.length > 1 ? "s" : ""}
              </span>
              <span className="font-mono">session {visit.sessionId.slice(0, 8)}</span>
            </div>
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className={`${thClass} w-44`}>Heure</th>
                  <th className={thClass}>Page</th>
                  <th className={thClass}>Venant de</th>
                  <th className={`${thClass} w-28 text-right`}>Durée</th>
                </tr>
              </thead>
              <tbody>
                {[...visit.views].reverse().map((v) => (
                  <tr key={v.id}>
                    <td className={`${tdClass} whitespace-nowrap text-xs text-text-secondary`}>{formatLocalDateTime(v.createdAt)}</td>
                    <td className={tdClass}>
                      <Link href={v.path} className="text-text hover:text-accent">
                        {v.path}
                      </Link>
                    </td>
                    <td className={`${tdClass} max-w-xs truncate text-xs text-text-secondary`}>{v.referrer ?? "—"}</td>
                    <td className={`${tdClass} text-right text-xs tabular-nums`}>{formatDuration(v.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}
