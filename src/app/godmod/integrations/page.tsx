import Link from "next/link";
import { CheckCircle2, CircleAlert, CircleDashed, KeyRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { formatLocalDateTime } from "@/lib/local-time";
import { serpApiOverview } from "@/lib/serpapi";
import { GOOGLE_NEWS_INTERVAL_MINUTES, isGoogleNewsSource } from "@/lib/importer/google-news";
import { TOPICS } from "@/lib/topic-list";
import { SubmitButton } from "@/components/admin/FormControls";
import { AdminHeader, AdminNotice, Card, buttonClass, inputClass, primaryButtonClass } from "@/components/admin/ui";
import { checkSerpApiAction, removeSerpApiKeyAction, saveSerpApiKeyAction, saveSubjectsAction } from "./actions";
import { MAX_SUBJECTS, NEWS_COUNTRIES, NEWS_LANGUAGES, subjectOf } from "./subjects";

export const dynamic = "force-dynamic";

const label = "mb-1 block text-sm font-medium text-text";
const hint = "mt-1 text-xs text-text-secondary";
/** Searches one subject spends in a month at one run every 6 hours. */
const SEARCHES_PER_SUBJECT = Math.round((30 * 24 * 60) / GOOGLE_NEWS_INTERVAL_MINUTES);

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminPage("/godmod/integrations");
  const { notice } = await searchParams;
  const [{ source, hint: keyHint, status }, sources] = await Promise.all([
    serpApiOverview(),
    prisma.importSource.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { items: true } } } }),
  ]);
  const news = sources.filter((s) => isGoogleNewsSource(s.url));
  const first = news[0] ? new URL(news[0].url).searchParams : null;
  const rows = Array.from({ length: MAX_SUBJECTS }, (_, i) => news[i] ?? null);

  const connected = !!keyHint && !!status?.ok;
  const failed = !!keyHint && status && !status.ok;
  const monthly = news.length * SEARCHES_PER_SUBJECT;

  return (
    <>
      <AdminHeader
        title="Intégrations"
        description="Services externes qui alimentent le site. Google News (via SerpApi) ajoute automatiquement des articles sur les sujets de votre choix."
      />
      <AdminNotice notice={notice} />

      <div className="grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="SerpApi · Google News">
          <div
            className={`mb-4 flex items-start gap-3 rounded-lg border p-3 text-sm ${
              connected ? "border-green-600/40 bg-green-600/10" : failed ? "border-red-500/40 bg-red-500/10" : "border-border bg-bg-secondary"
            }`}
          >
            {connected ? (
              <CheckCircle2 size={20} className="shrink-0 text-green-600" aria-hidden />
            ) : failed ? (
              <CircleAlert size={20} className="shrink-0 text-red-500" aria-hidden />
            ) : (
              <CircleDashed size={20} className="shrink-0 text-text-secondary" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text">
                {connected ? "Connecté" : failed ? "Problème de connexion" : keyHint ? "Clé non vérifiée" : "Non configuré"}
              </p>
              <p className="text-text-secondary">
                {status?.message ?? (keyHint ? "Cliquez sur « Vérifier la connexion »." : "Ajoutez votre clé API SerpApi pour activer Google News.")}
              </p>
              {keyHint && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <dt className="text-text-secondary">Clé</dt>
                  <dd className="font-mono text-text">
                    {keyHint} {source === "env" && <span className="font-sans text-text-secondary">(variable d&apos;environnement)</span>}
                  </dd>
                  {status?.plan && (
                    <>
                      <dt className="text-text-secondary">Offre</dt>
                      <dd className="text-text">{status.plan}</dd>
                    </>
                  )}
                  {status?.searchesLeft != null && (
                    <>
                      <dt className="text-text-secondary">Recherches restantes</dt>
                      <dd className="tabular-nums text-text">
                        {status.searchesLeft}
                        {status.searchesPerMonth != null && ` / ${status.searchesPerMonth} par mois`}
                      </dd>
                    </>
                  )}
                  {status?.checkedAt && (
                    <>
                      <dt className="text-text-secondary">Vérifiée</dt>
                      <dd className="text-text">{formatLocalDateTime(new Date(status.checkedAt))}</dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          </div>

          <form action={saveSerpApiKeyAction} className="space-y-2">
            <label htmlFor="apiKey" className={label}>
              {keyHint ? "Remplacer la clé API" : "Clé API"}
            </label>
            <div className="relative">
              <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden />
              <input
                id="apiKey"
                name="apiKey"
                type="password"
                required
                autoComplete="off"
                spellCheck={false}
                minLength={64}
                maxLength={64}
                placeholder="Collez votre clé (64 caractères)"
                className={`${inputClass} pl-9 font-mono`}
              />
            </div>
            <p className={hint}>
              Trouvez-la sur{" "}
              <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                serpapi.com/manage-api-key
              </a>
              . Elle est vérifiée auprès de SerpApi (sans consommer de recherche), puis enregistrée chiffrée ; elle n&apos;est jamais réaffichée.
            </p>
            <SubmitButton className={primaryButtonClass} pendingLabel="Vérification…">
              Enregistrer et vérifier
            </SubmitButton>
          </form>

          {keyHint && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <form action={checkSerpApiAction}>
                <SubmitButton className={buttonClass} pendingLabel="Vérification…">
                  Vérifier la connexion
                </SubmitButton>
              </form>
              {source === "admin" && (
                <form action={removeSerpApiKeyAction}>
                  <SubmitButton className="text-sm text-red-500 hover:underline" confirm="Supprimer la clé SerpApi ? Les imports Google News s'arrêteront.">
                    Supprimer la clé
                  </SubmitButton>
                </form>
              )}
            </div>
          )}
        </Card>

        <Card title="Sujets de recherche">
          <form action={saveSubjectsAction} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Jusqu&apos;à {MAX_SUBJECTS} sujets. Chaque sujet est cherché sur Google News toutes les {GOOGLE_NEWS_INTERVAL_MINUTES / 60} heures
              (articles des 7 derniers jours). Chaque article est lu pour récupérer ses métadonnées (description, mots-clés, image) et reçoit une
              méta : celle détectée, sinon celle choisie ici. Il apparaît alors en page d&apos;accueil avec son étiquette.
            </p>
            <ol className="space-y-3">
              {rows.map((row, i) => (
                <li key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)_9rem] items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-text-secondary">{i + 1}</span>
                  <input
                    name={`subject-${i}`}
                    defaultValue={row ? subjectOf(row.url) : ""}
                    maxLength={100}
                    placeholder={["startups Congo", "fintech Afrique centrale", "événements tech Brazzaville"][i]}
                    aria-label={`Sujet ${i + 1}`}
                    className={inputClass}
                  />
                  <select name={`topic-${i}`} defaultValue={row?.topic ?? "tech"} aria-label={`Méta du sujet ${i + 1}`} className={inputClass}>
                    {TOPICS.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ol>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="gl" className={label}>
                  Pays
                </label>
                <select id="gl" name="gl" defaultValue={first?.get("gl") ?? "cg"} className={inputClass}>
                  {NEWS_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="hl" className={label}>
                  Langue
                </label>
                <select id="hl" name="hl" defaultValue={first?.get("hl") ?? "fr"} className={inputClass}>
                  {NEWS_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="maxItems" className={label}>
                  Articles par recherche
                </label>
                <input id="maxItems" name="maxItems" type="number" min={1} max={30} defaultValue={news[0]?.maxItems ?? 10} className={inputClass} />
              </div>
            </div>
            <p className={hint}>
              Consommation : {SEARCHES_PER_SUBJECT} recherches par mois et par sujet
              {news.length > 0 && <> (soit environ {monthly} pour vos {news.length} sujet{news.length > 1 ? "s" : ""})</>}
              {status?.searchesPerMonth != null && monthly > status.searchesPerMonth && (
                <span className="font-medium text-red-500"> : plus que les {status.searchesPerMonth} de votre offre</span>
              )}
              . Un import manuel compte aussi une recherche.
            </p>
            <SubmitButton className={primaryButtonClass}>Enregistrer les sujets</SubmitButton>
          </form>

          {news.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
              {news.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-medium text-text">{subjectOf(s.url)}</span>
                    <span className="block text-text-secondary">
                      {s.lastRunAt ? `${formatLocalDateTime(s.lastRunAt)} · ${s.lastResult ?? ""}` : "Pas encore importé"}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-text-secondary">{s._count.items} articles</span>
                </li>
              ))}
              <li>
                <Link href="/godmod/importation" className="text-accent hover:underline">
                  Importer maintenant depuis la page Importation →
                </Link>
              </li>
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
