import Link from "next/link";
import { createTermAction, deleteTermAction, updateTermAction } from "@/app/godmod/categories/actions";
import { SubmitButton } from "./FormControls";
import { AdminHeader, AdminNotice, Card, inputClass, primaryButtonClass, buttonClass, tdClass, thClass } from "./ui";

export interface Term {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  count: number;
}

const label = "mb-1 block text-sm font-medium text-text";

/** WordPress-style taxonomy screen: "add" form on the left, editable table on the right. */
export function TermsScreen({
  kind,
  title,
  description,
  terms,
  notice,
  publicPath,
}: {
  kind: "category" | "tag";
  title: string;
  description: string;
  terms: Term[];
  notice?: string;
  publicPath: string;
}) {
  const isCategory = kind === "category";
  const noun = isCategory ? "catégorie" : "étiquette";

  return (
    <>
      <AdminHeader title={title} description={description} />
      <AdminNotice notice={notice} />

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card title={`Ajouter une ${noun}`}>
          <form action={createTermAction} className="space-y-3">
            <input type="hidden" name="kind" value={kind} />
            <div>
              <label htmlFor="name" className={label}>
                Nom
              </label>
              <input id="name" name="name" required maxLength={60} className={inputClass} />
            </div>
            <div>
              <label htmlFor="slug" className={label}>
                Slug
              </label>
              <input id="slug" name="slug" maxLength={60} placeholder="généré depuis le nom" className={inputClass} />
              <p className="mt-1 text-xs text-text-secondary">Utilisé dans l&apos;adresse : {publicPath}/<em>slug</em></p>
            </div>
            {isCategory && (
              <div>
                <label htmlFor="description" className={label}>
                  Description
                </label>
                <textarea id="description" name="description" rows={3} maxLength={500} className={inputClass} />
              </div>
            )}
            <SubmitButton className={primaryButtonClass}>Ajouter</SubmitButton>
          </form>
        </Card>

        <form>
          <input type="hidden" name="kind" value={kind} />
          <div className="overflow-x-auto rounded-xl border border-border bg-bg">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Nom</th>
                  {isCategory && <th className={thClass}>Description</th>}
                  <th className={thClass}>Slug</th>
                  <th className={`${thClass} text-right`}>Articles</th>
                </tr>
              </thead>
              <tbody>
                {terms.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`${tdClass} py-10 text-center text-text-secondary`}>
                      Aucune {noun} pour le moment.
                    </td>
                  </tr>
                )}
                {terms.map((term) => (
                  <tr key={term.id}>
                    <td className={tdClass}>
                      <span className="font-medium text-text">{term.name}</span>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-accent hover:underline">Modifier</summary>
                        <div className="mt-2 space-y-2">
                          <input name={`name-${term.id}`} defaultValue={term.name} aria-label="Nom" className={inputClass} />
                          <input name={`slug-${term.id}`} defaultValue={term.slug} aria-label="Slug" className={inputClass} />
                          {isCategory && (
                            <textarea name={`description-${term.id}`} defaultValue={term.description ?? ""} rows={2} aria-label="Description" className={inputClass} />
                          )}
                          <SubmitButton formAction={updateTermAction} name="editId" value={String(term.id)} className={buttonClass}>
                            Enregistrer
                          </SubmitButton>
                        </div>
                      </details>
                      <div className="mt-1 flex gap-3 text-xs">
                        <Link href={`${publicPath}/${term.slug}`} className="text-accent hover:underline">
                          Voir
                        </Link>
                        <SubmitButton formAction={deleteTermAction} name="deleteId" value={String(term.id)} className="text-red-500 hover:underline"
                          confirm={`Supprimer « ${term.name} » ? Les articles restent, ils perdent seulement cette ${noun}.`}>
                          Supprimer
                        </SubmitButton>
                      </div>
                    </td>
                    {isCategory && <td className={`${tdClass} text-text-secondary`}>{term.description || "—"}</td>}
                    <td className={`${tdClass} text-text-secondary`}>{term.slug}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      <Link href={isCategory ? `/godmod/articles?categorie=${term.id}` : `${publicPath}/${term.slug}`} className="text-accent hover:underline">
                        {term.count}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      </div>
    </>
  );
}
