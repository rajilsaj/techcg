import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { formatLocalDateTime } from "@/lib/local-time";
import { listCategories } from "@/lib/taxonomy";
import { IMPORT_INTERVAL_MINUTES } from "@/lib/importer/schedule";
import { lastAutoImport } from "@/lib/cron-auth";
import { describeGoogleNews, isGoogleNewsSource } from "@/lib/importer/google-news";
import { FAILING_AFTER } from "@/lib/importer/run";
import { PendingNotice, SubmitButton } from "@/components/admin/FormControls";
import { AdminHeader, AdminNotice, Card, buttonClass, inputClass, primaryButtonClass, tdClass, thClass } from "@/components/admin/ui";
import { createSourceAction, deleteSourceAction, reanalyzeAction, removeDemoAction, runImportAction, updateSourceAction } from "./actions";

export const dynamic = "force-dynamic";
// An import fetches many pages; give the server action room to finish.
export const maxDuration = 300;

const label = "mb-1 block text-sm font-medium text-text";
const IMPORT_NOTICE = "Importation en cours… Cela peut prendre jusqu'à une minute, gardez cette page ouverte.";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ImportPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/importation");
  const { notice, rapport } = await searchParams;

  const [sources, categories, demoMembers, demoArticles, toAnalyze, auto] = await Promise.all([
    prisma.importSource.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { items: true } } },
    }),
    listCategories(),
    prisma.user.count({ where: { email: { endsWith: "@demo.invalid" } } }),
    prisma.item.count({ where: { author: { email: { endsWith: "@demo.invalid" } } } }),
    prisma.item.count({ where: { type: "story", url: { not: null }, analyzedAt: null } }),
    lastAutoImport(),
  ]);
  const autoAge = auto ? Date.now() - new Date(auto.at).getTime() : null;
  // Runs every 30 minutes: more than 2 hours without one means the schedule is not working.
  const autoHealthy = autoAge !== null && autoAge < 2 * 60 * 60 * 1000 && !auto?.error;
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const failing = sources.filter((s) => s.enabled && s.failCount >= FAILING_AFTER);

  const categorySelect = (name: string, value: number | null) => (
    <select name={name} defaultValue={value ?? ""} className={inputClass} aria-label="Catégorie">
      <option value="">Aucune catégorie</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <AdminHeader
        title="Importation"
        description={`Récupère les derniers articles de sites d'actualité : titre, image, court extrait et lien vers l'article d'origine. Automatique : chaque source active est relue toutes les ${IMPORT_INTERVAL_MINUTES} minutes (Google News : toutes les 6 heures), sans appuyer sur « Importer ».`}
        actions={
          sources.some((s) => s.enabled) && (
            <form action={runImportAction}>
              <SubmitButton name="run" value="all" className={primaryButtonClass} pendingLabel="Importation…">
                Tout importer maintenant
              </SubmitButton>
              <PendingNotice>{IMPORT_NOTICE}</PendingNotice>
            </form>
          )
        }
      />
      <AdminNotice notice={notice} />

      {failing.length > 0 && (
        <section role="alert" className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-text">
          <h2 className="font-semibold">
            {failing.length === 1 ? "1 source ne fonctionne plus" : `${failing.length} sources ne fonctionnent plus`}
          </h2>
          <ul className="mt-1.5 space-y-0.5">
            {failing.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.name}</span> : {s.failCount} échecs de suite
                {s.failingSince && ` depuis le ${formatLocalDateTime(s.failingSince)}`} — {s.lastResult?.replace(/^Échec : /, "")}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-text-secondary">
            Que faire ? Consultez le{" "}
            <Link href="/godmod/importation/guide#pannes" className="text-accent hover:underline">
              guide de configuration
            </Link>
            .
          </p>
        </section>
      )}

      <section className="mb-4 rounded-xl border border-border bg-bg p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${autoHealthy ? "bg-green-600" : auto ? "bg-amber-500" : "bg-border"}`} />
            Importation automatique {autoHealthy ? "active" : auto ? "en retard" : "en attente du premier passage"}
          </h2>
          <p className="text-xs text-text-secondary">Toutes les 30 minutes, sans action de votre part</p>
        </div>
        {auto ? (
          <div className="mt-2 text-sm text-text-secondary">
            <p>
              Dernier passage : <span className="text-text">{formatLocalDateTime(new Date(auto.at))}</span> ({auto.trigger})
              {auto.error ? <span className="text-red-500"> · {auto.error}</span> : auto.ran.length === 0 ? " · aucune source à relire" : ` · ${auto.ran.length} source(s) relue(s)`}
            </p>
            {auto.ran.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs">
                {auto.ran.map((r, i) => (
                  <li key={i}>
                    <span className="text-text">{r.name}</span> : {r.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">Le premier passage automatique apparaîtra ici.</p>
        )}
      </section>

      {demoMembers > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-text">
          <p>
            Le site contient encore <strong>{demoArticles} articles de démonstration</strong> ({demoMembers} comptes fictifs). Une fois
            l&apos;importation réussie, supprimez-les pour ne garder que les vrais articles.
          </p>
          <form action={removeDemoAction} className="mt-3">
            <SubmitButton className={`${buttonClass} border-red-500/50 text-red-500 hover:border-red-500 hover:text-red-500`}
              confirm={`Supprimer définitivement les ${demoArticles} articles de démonstration et les ${demoMembers} comptes fictifs ?`}>
              Supprimer les articles de démo
            </SubmitButton>
          </form>
        </div>
      )}

      <form className="mb-6">
        <PendingNotice>{IMPORT_NOTICE}</PendingNotice>
        <div className="overflow-x-auto rounded-xl border border-border bg-bg">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Source</th>
                <th className={thClass}>Dernière importation</th>
                <th className={`${thClass} text-right`}>Articles</th>
                <th className={`${thClass} w-40`} />
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 && (
                <tr>
                  <td colSpan={4} className={`${tdClass} py-10 text-center text-text-secondary`}>
                    Aucune source. Ajoutez-en une ci-dessous.
                  </td>
                </tr>
              )}
              {sources.map((s) => (
                <tr key={s.id} className={s.enabled ? undefined : "opacity-60"}>
                  <td className={tdClass}>
                    <span className="font-medium text-text">{s.name}</span>
                    {!s.enabled && <span className="ml-2 text-xs text-text-secondary">(désactivée)</span>}
                    {s.enabled && s.failCount >= FAILING_AFTER && (
                      <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white" title={`${s.failCount} échecs de suite`}>
                        En panne
                      </span>
                    )}
                    {s.render && (
                      <span className="ml-2 rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary" title="Pages ouvertes dans un navigateur">
                        Navigateur
                      </span>
                    )}
                    {s.strict && (
                      <span
                        className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
                        title="Seuls les articles sur les startups, l'entrepreneuriat ou la tech sont importés"
                      >
                        Filtré
                      </span>
                    )}
                    <div className="truncate text-xs text-text-secondary">
                      {isGoogleNewsSource(s.url) ? `Google News ${describeGoogleNews(s.url)}` : s.url}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {s.maxItems} articles max par import{s.categoryId && ` · ${categoryName.get(s.categoryId) ?? ""}`}
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-accent hover:underline">Modifier</summary>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input name={`name-${s.id}`} defaultValue={s.name} aria-label="Nom" className={inputClass} />
                        <input name={`url-${s.id}`} defaultValue={s.url} aria-label="Adresse" className={inputClass} />
                        <input name={`maxItems-${s.id}`} type="number" min={1} max={100} defaultValue={s.maxItems} aria-label="Articles max" className={inputClass} />
                        {categorySelect(`categoryId-${s.id}`, s.categoryId)}
                        <label className="flex items-center gap-2 text-sm text-text">
                          <input type="checkbox" name={`enabled-${s.id}`} defaultChecked={s.enabled} className="h-4 w-4 accent-[var(--accent)]" />
                          Active
                        </label>
                        {!isGoogleNewsSource(s.url) && (
                          <fieldset className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:col-span-2 sm:grid-cols-2">
                            <legend className="px-1 text-xs font-medium text-text-secondary">
                              Fiche publique (page Sources) — laissez vide pour la remplir depuis le site
                            </legend>
                            <input name={`siteName-${s.id}`} defaultValue={s.siteName ?? ""} placeholder="Nom affiché" aria-label="Nom affiché" className={inputClass} />
                            <input name={`country-${s.id}`} defaultValue={s.country ?? ""} placeholder="Pays" aria-label="Pays" className={inputClass} />
                            <input name={`logoUrl-${s.id}`} defaultValue={s.logoUrl ?? ""} placeholder="Adresse du logo (https://…)" aria-label="Logo" className={`${inputClass} sm:col-span-2`} />
                            <textarea name={`description-${s.id}`} defaultValue={s.description ?? ""} rows={2} maxLength={280} placeholder="Ce que publie ce site" aria-label="Description" className={`${inputClass} sm:col-span-2`} />
                          </fieldset>
                        )}
                        <label className="flex items-center gap-2 text-sm text-text sm:col-span-2">
                          <input type="checkbox" name={`strict-${s.id}`} defaultChecked={s.strict} className="h-4 w-4 accent-[var(--accent)]" />
                          Filtrer : n&apos;importer que les articles sur les startups, l&apos;entrepreneuriat et la tech
                        </label>
                        {!isGoogleNewsSource(s.url) && (
                          <label className="flex items-center gap-2 text-sm text-text sm:col-span-2">
                            <input type="checkbox" name={`render-${s.id}`} defaultChecked={s.render} className="h-4 w-4 accent-[var(--accent)]" />
                            Navigateur : ouvrir les pages dans un navigateur (sites construits en JavaScript, plus lent)
                          </label>
                        )}
                        <div className="flex items-center gap-3">
                          <SubmitButton formAction={updateSourceAction} name="editId" value={String(s.id)} className={buttonClass}>
                            Enregistrer
                          </SubmitButton>
                          <SubmitButton formAction={deleteSourceAction} name="deleteId" value={String(s.id)} className="text-sm text-red-500 hover:underline"
                            confirm={`Supprimer la source « ${s.name} » ? Les articles déjà importés restent.`}>
                            Supprimer
                          </SubmitButton>
                        </div>
                      </div>
                    </details>
                  </td>
                  <td className={`${tdClass} text-xs`}>
                    {s.lastRunAt ? (
                      <>
                        <span className="text-text-secondary">{formatLocalDateTime(s.lastRunAt)}</span>
                        <p className={`mt-0.5 ${s.lastResult?.startsWith("Échec") ? "text-red-500" : "text-text"}`}>{s.lastResult}</p>
                      </>
                    ) : (
                      <span className="text-text-secondary">Jamais</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {isGoogleNewsSource(s.url) ? (
                      s._count.items
                    ) : (
                      <Link href={`/godmod/articles?q=${encodeURIComponent(new URL(s.url).hostname.replace(/^www\./, ""))}`} className="text-accent hover:underline">
                        {s._count.items}
                      </Link>
                    )}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <SubmitButton formAction={runImportAction} name="run" value={String(s.id)} className={buttonClass} pendingLabel="Importation…">
                      Importer maintenant
                    </SubmitButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Ajouter une source">
          <form action={createSourceAction} className="space-y-3">
            <div>
              <label htmlFor="name" className={label}>
                Nom
              </label>
              <input id="name" name="name" required maxLength={80} placeholder="Developpez.com" className={inputClass} />
            </div>
            <div>
              <label htmlFor="url" className={label}>
                Adresse du site ou de son flux RSS
              </label>
              <input id="url" name="url" type="url" required placeholder="https://www.exemple.com/" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="maxItems" className={label}>
                  Articles max par import
                </label>
                <input id="maxItems" name="maxItems" type="number" min={1} max={100} defaultValue={20} className={inputClass} />
              </div>
              <div>
                <label htmlFor="categoryId" className={label}>
                  Catégorie
                </label>
                {categorySelect("categoryId", null)}
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-text">
              <input type="checkbox" name="strict" defaultChecked className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
              <span>
                Filtrer : n&apos;importer que les articles sur les startups, l&apos;entrepreneuriat et la tech
                <span className="block text-xs text-text-secondary">À garder coché pour un site d&apos;actualité générale ; décochez pour un site 100 % tech.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-text">
              <input type="checkbox" name="render" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
              <span>
                Navigateur : ouvrir les pages dans un navigateur
                <span className="block text-xs text-text-secondary">
                  Seulement si l&apos;import trouve 0 article alors que le site en affiche (site construit en JavaScript).{" "}
                  <Link href="/godmod/importation/guide#navigateur" className="text-accent hover:underline">En savoir plus</Link>
                </span>
              </span>
            </label>
            <SubmitButton className={primaryButtonClass}>Ajouter la source</SubmitButton>
          </form>
        </Card>

        <Card title="Analyse des articles">
          <p className="text-sm text-text-secondary">
            Chaque nouvel article est lu en entier : résumé, temps de lecture, et image mesurée. Une image absente ou trop petite
            (logo, icône) est remplacée par l&apos;illustration de son sujet (IA, Tech, Startups, Entrepreneurs, Événements).
          </p>
          <p className="mt-2 text-sm text-text">
            <strong className="tabular-nums">{toAnalyze}</strong> article{toAnalyze > 1 ? "s" : ""} déjà publié{toAnalyze > 1 ? "s" : ""} pas encore analysé{toAnalyze > 1 ? "s" : ""}.
          </p>
          {rapport && notice === "analyzed" && <p className="mt-2 rounded-md bg-bg-secondary p-2 text-xs text-text">{rapport}</p>}
          {toAnalyze > 0 && (
            <form action={reanalyzeAction} className="mt-3">
              <SubmitButton className={buttonClass} pendingLabel="Analyse en cours…">
                Analyser les articles
              </SubmitButton>
              <PendingNotice>Analyse en cours… jusqu&apos;à 3 minutes, gardez cette page ouverte.</PendingNotice>
            </form>
          )}
        </Card>

        <Card title="Comment ça marche">
          <p className="mb-3 text-sm text-text">
            Tout le détail (flux, filtres, navigateur, sites qui bloquent, pannes) est dans le{" "}
            <Link href="/godmod/importation/guide" className="text-accent hover:underline">
              guide de configuration
            </Link>
            .
          </p>
          <p className="mb-3 text-sm text-text">
            Pour ajouter des articles Google News sur vos sujets, configurez SerpApi dans{" "}
            <Link href="/godmod/integrations" className="text-accent hover:underline">
              Intégrations
            </Link>
            .
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
            <li>L&apos;outil cherche d&apos;abord le flux RSS/Atom du site (annoncé dans sa page ou donné directement).</li>
            <li>Sans flux, il lit la page d&apos;accueil, repère les liens d&apos;articles et lit chaque article (titre, image, extrait).</li>
            <li>Les articles déjà présents sont ignorés : relancer l&apos;import n&apos;ajoute que les nouveautés.</li>
            <li>Chaque article est publié sous un compte au nom de la source et renvoie vers l&apos;article d&apos;origine. Les extraits sont traduits en français si besoin.</li>
            <li>Seuls le titre, l&apos;image et un court extrait sont repris, jamais le texte complet des articles.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
