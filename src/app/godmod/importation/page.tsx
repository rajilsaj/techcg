import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { formatLocalDateTime } from "@/lib/local-time";
import { listCategories } from "@/lib/taxonomy";
import { SubmitButton } from "@/components/admin/FormControls";
import { AdminHeader, AdminNotice, Card, buttonClass, inputClass, primaryButtonClass, tdClass, thClass } from "@/components/admin/ui";
import { createSourceAction, deleteSourceAction, removeDemoAction, runImportAction, updateSourceAction } from "./actions";

export const dynamic = "force-dynamic";
// An import fetches many pages; give the server action room to finish.
export const maxDuration = 300;

const label = "mb-1 block text-sm font-medium text-text";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ImportPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/importation");
  const { notice } = await searchParams;

  const [sources, categories, demoMembers, demoArticles] = await Promise.all([
    prisma.importSource.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { items: true } } },
    }),
    listCategories(),
    prisma.user.count({ where: { email: { endsWith: "@demo.invalid" } } }),
    prisma.item.count({ where: { author: { email: { endsWith: "@demo.invalid" } } } }),
  ]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

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
        description="Récupère les derniers articles de sites d'actualité : titre, image, court extrait et lien vers l'article d'origine."
        actions={
          sources.some((s) => s.enabled) && (
            <form action={runImportAction}>
              <SubmitButton name="run" value="all" className={primaryButtonClass}>
                Tout importer maintenant
              </SubmitButton>
            </form>
          )
        }
      />
      <AdminNotice notice={notice} />

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
                    <div className="truncate text-xs text-text-secondary">{s.url}</div>
                    <div className="text-xs text-text-secondary">
                      {s.maxItems} articles max par import{s.categoryId && ` · ${categoryName.get(s.categoryId) ?? ""}`}
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-accent hover:underline">Modifier</summary>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <input name={`name-${s.id}`} defaultValue={s.name} aria-label="Nom" className={inputClass} />
                        <input name={`url-${s.id}`} defaultValue={s.url} aria-label="Adresse" className={inputClass} />
                        <input name={`maxItems-${s.id}`} type="number" min={1} max={100} defaultValue={s.maxItems} aria-label="Articles max" className={inputClass} />
                        {categorySelect(`categoryId-${s.id}`, s.categoryId)}
                        <label className="flex items-center gap-2 text-sm text-text">
                          <input type="checkbox" name={`enabled-${s.id}`} defaultChecked={s.enabled} className="h-4 w-4 accent-[var(--accent)]" />
                          Active
                        </label>
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
                    <Link href={`/godmod/articles?q=${encodeURIComponent(new URL(s.url).hostname.replace(/^www\./, ""))}`} className="text-accent hover:underline">
                      {s._count.items}
                    </Link>
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <SubmitButton formAction={runImportAction} name="run" value={String(s.id)} className={buttonClass}>
                      Importer maintenant
                    </SubmitButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
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
            <SubmitButton className={primaryButtonClass}>Ajouter la source</SubmitButton>
          </form>
        </Card>

        <Card title="Comment ça marche">
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
