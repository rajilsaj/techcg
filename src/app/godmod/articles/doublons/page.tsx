import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { formatLocalDateTime } from "@/lib/local-time";
import { findDuplicateGroups } from "@/lib/duplicates-merge";
import { SubmitButton } from "@/components/admin/FormControls";
import { AdminHeader, AdminNotice, buttonClass, primaryButtonClass } from "@/components/admin/ui";
import { mergeDuplicatesAction } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

/** Admin › Articles › Doublons: the same article published more than once, and merging them. */
export default async function DuplicatesPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/articles/doublons");
  const { notice } = await searchParams;
  const groups = await findDuplicateGroups();
  const copies = groups.reduce((n, g) => n + g.length - 1, 0);

  return (
    <>
      <AdminHeader
        title="Doublons"
        description="Le même article publié plusieurs fois : même adresse (avec ou sans www, /amp, paramètres de suivi…) ou même titre à moins de 14 jours d'écart. L'importation les écarte déjà ; cette page sert à nettoyer ceux qui sont passés."
        actions={
          groups.length > 0 && (
            <form action={mergeDuplicatesAction}>
              <SubmitButton name="merge" value="all" className={primaryButtonClass} pendingLabel="Fusion…"
                confirm={`Fusionner les ${groups.length} groupes ? ${copies} copie(s) iront à la corbeille.`}>
                Tout fusionner ({copies})
              </SubmitButton>
            </form>
          )
        }
      />
      <AdminNotice notice={notice} />

      <p className="mb-4 text-sm text-text-secondary">
        Pour chaque groupe, la publication <strong className="text-text">gardée</strong> est celle qui a le plus de commentaires, puis de points, puis de
        consultations, sinon la plus ancienne. Les copies vont à la corbeille (restaurables) et leurs consultations s&apos;ajoutent à celle gardée. Une copie qui a
        des commentaires n&apos;est jamais supprimée automatiquement.
      </p>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-bg px-6 py-12 text-center text-sm text-text-secondary">
          Aucun doublon parmi les 3 000 dernières publications.
        </p>
      ) : (
        <form action={mergeDuplicatesAction} className="space-y-3">
          {groups.map((group) => (
            <section key={group[0].id} className="rounded-xl border border-border bg-bg p-4">
              <ul className="space-y-2">
                {group.map((item, i) => (
                  <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        i === 0 ? "bg-green-600/15 text-green-700 dark:text-green-500" : item.commentCount > 0 ? "bg-amber-500/15 text-amber-700" : "bg-bg-secondary text-text-secondary"
                      }`}
                    >
                      {i === 0 ? "Gardée" : item.commentCount > 0 ? "À vérifier (commentaires)" : "Copie"}
                    </span>
                    <Link href={`/godmod/articles/${item.id}`} className="min-w-0 flex-1 font-medium text-text hover:text-accent">
                      #{item.id} · {item.title}
                    </Link>
                    <span className="w-full text-xs text-text-secondary">
                      {item.source ?? "Membre"} · {formatLocalDateTime(item.createdAt)} · {item.commentCount} comm. · {item.points} pts · {item.viewCount} consult.
                      {item.url && (
                        <>
                          {" · "}
                          <a href={item.url} target="_blank" rel="noreferrer" className="break-all hover:text-accent">
                            {item.url}
                          </a>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <SubmitButton name="merge" value={String(group[0].id)} className={buttonClass} pendingLabel="Fusion…">
                  Fusionner ce groupe
                </SubmitButton>
              </div>
            </section>
          ))}
        </form>
      )}
    </>
  );
}
