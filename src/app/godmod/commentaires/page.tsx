import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { formatLocalDateTime } from "@/lib/local-time";
import { SelectAll, SubmitButton } from "@/components/admin/FormControls";
import {
  AdminHeader,
  AdminNotice,
  AdminPagination,
  SearchForm,
  StatusBadge,
  StatusTabs,
  adminHref,
  buttonClass,
  inputClass,
  tdClass,
  thClass,
} from "@/components/admin/ui";
import { editCommentAction, moderateCommentsAction, replyCommentAction } from "./actions";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;
const TABS = [
  { key: "tous", label: "Tous" },
  { key: "pending", label: "En attente" },
  { key: "published", label: "Approuvés" },
  { key: "spam", label: "Indésirables" },
  { key: "trash", label: "Corbeille" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const rowButton = "text-xs text-accent hover:underline";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CommentsAdminPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/commentaires");
  const params = await searchParams;
  const status: Tab = TABS.some((t) => t.key === params.statut) ? (params.statut as Tab) : "tous";
  const q = params.q?.trim() || undefined;
  const article = params.article && /^\d+$/.test(params.article) ? params.article : undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const base: Prisma.ItemWhereInput = {
    type: "comment",
    ...(article ? { parentId: parseInt(article, 10) } : {}),
    ...(q
      ? { OR: [{ text: { contains: q, mode: "insensitive" } }, { author: { username: { contains: q, mode: "insensitive" } } }] }
      : {}),
  };
  // "Tous" = what a moderator deals with: approved and pending, not spam or trash.
  const where: Prisma.ItemWhereInput = { ...base, status: status === "tous" ? { in: ["published", "pending"] } : status };

  const [counts, total, comments, articleTitle] = await Promise.all([
    prisma.item.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        text: true,
        status: true,
        createdAt: true,
        author: { select: { username: true, email: true, banned: true } },
        parent: { select: { id: true, title: true } },
      },
    }),
    article ? prisma.item.findUnique({ where: { id: parseInt(article, 10) }, select: { title: true } }) : null,
  ]);

  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const filters = { statut: status, q, article };
  const href = (overrides: Record<string, string | number | undefined>) => adminHref("/godmod/commentaires", { ...filters, ...overrides });
  const currentUrl = href({ page });
  const removed = status === "spam" || status === "trash";

  return (
    <>
      <AdminHeader
        title="Commentaires"
        description={articleTitle ? `Commentaires sur « ${articleTitle.title ?? "Sans titre"} »` : "Approuvez, modérez et répondez aux commentaires."}
        actions={
          article && (
            <Link href={href({ article: undefined, page: undefined })} className={buttonClass}>
              Tous les articles
            </Link>
          )
        }
      />
      <AdminNotice notice={params.notice} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusTabs
          active={status}
          hrefFor={(key) => href({ statut: key, page: undefined })}
          tabs={TABS.map((t) => ({
            key: t.key,
            label: t.label,
            count: t.key === "tous" ? countOf("published") + countOf("pending") : countOf(t.key),
          }))}
        />
        <SearchForm action="/godmod/commentaires" query={q} keep={{ statut: status === "tous" ? undefined : status, article }} placeholder="Texte ou auteur…" />
      </div>

      <form action={moderateCommentsAction}>
        <input type="hidden" name="back" value={currentUrl} />
        <div className="mb-3 flex items-center gap-2">
          <select name="bulk" defaultValue="" className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" aria-label="Action groupée">
            <option value="">Actions groupées</option>
            {removed ? (
              <>
                <option value="restore">Restaurer</option>
                <option value="delete">Supprimer définitivement</option>
              </>
            ) : (
              <>
                <option value="approve">Approuver</option>
                <option value="unapprove">Désapprouver</option>
                <option value="spam">Marquer comme indésirable</option>
                <option value="trash">Déplacer dans la corbeille</option>
              </>
            )}
          </select>
          <SubmitButton className={buttonClass} confirm={removed ? "Appliquer cette action ? La suppression est définitive." : undefined}>
            Appliquer
          </SubmitButton>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-bg">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className={`${thClass} w-10`}>
                  <SelectAll />
                </th>
                <th className={`${thClass} w-44`}>Auteur</th>
                <th className={thClass}>Commentaire</th>
                <th className={`${thClass} w-56`}>En réponse à</th>
              </tr>
            </thead>
            <tbody>
              {comments.length === 0 && (
                <tr>
                  <td colSpan={4} className={`${tdClass} py-10 text-center text-text-secondary`}>
                    Aucun commentaire.
                  </td>
                </tr>
              )}
              {comments.map((c) => (
                <tr key={c.id} className={c.status === "pending" ? "bg-amber-500/5" : undefined}>
                  <td className={`${tdClass} ${c.status === "pending" ? "border-l-4 border-l-amber-500" : ""}`}>
                    <input type="checkbox" name="ids" value={c.id} aria-label={`Sélectionner le commentaire #${c.id}`} className="h-4 w-4 accent-[var(--accent)]" />
                  </td>
                  <td className={tdClass}>
                    <Link href={`/godmod/utilisateurs?q=${encodeURIComponent(c.author.username)}`} className="font-medium text-text hover:text-accent">
                      {c.author.username}
                    </Link>
                    {c.author.email && <div className="truncate text-xs text-text-secondary">{c.author.email}</div>}
                    {c.author.banned && <div className="text-xs text-red-500">Suspendu</div>}
                  </td>
                  <td className={tdClass}>
                    <p className="mb-1 text-xs text-text-secondary">
                      {formatLocalDateTime(c.createdAt)}{" "}
                      {c.status === "pending" && <StatusBadge status="pending" label="En attente" />}
                    </p>
                    <p className="whitespace-pre-wrap text-text">{c.text}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {removed ? (
                        <>
                          <SubmitButton name="row" value={`restore:${c.id}`} className={rowButton}>
                            Restaurer
                          </SubmitButton>
                          <SubmitButton name="row" value={`delete:${c.id}`} confirm="Supprimer définitivement ce commentaire ?" className="text-xs text-red-500 hover:underline">
                            Supprimer définitivement
                          </SubmitButton>
                        </>
                      ) : (
                        <>
                          {c.status === "pending" ? (
                            <SubmitButton name="row" value={`approve:${c.id}`} className="text-xs font-medium text-green-600 hover:underline">
                              Approuver
                            </SubmitButton>
                          ) : (
                            <SubmitButton name="row" value={`unapprove:${c.id}`} className="text-xs text-amber-600 hover:underline">
                              Désapprouver
                            </SubmitButton>
                          )}
                          <SubmitButton name="row" value={`spam:${c.id}`} className={rowButton}>
                            Indésirable
                          </SubmitButton>
                          <SubmitButton name="row" value={`trash:${c.id}`} className="text-xs text-red-500 hover:underline">
                            Corbeille
                          </SubmitButton>
                        </>
                      )}
                    </div>

                    {!removed && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <details>
                          <summary className="cursor-pointer text-xs text-accent hover:underline">Répondre</summary>
                          <textarea name={`reply-${c.id}`} rows={3} placeholder={`Répondre à ${c.author.username}…`} className={`${inputClass} mt-1`} />
                          <SubmitButton formAction={replyCommentAction} name="replyTo" value={String(c.id)} className={`${buttonClass} mt-1`}>
                            Publier la réponse
                          </SubmitButton>
                        </details>
                        <details>
                          <summary className="cursor-pointer text-xs text-accent hover:underline">Modifier</summary>
                          <textarea name={`edit-${c.id}`} rows={3} defaultValue={c.text ?? ""} className={`${inputClass} mt-1`} />
                          <SubmitButton formAction={editCommentAction} name="editId" value={String(c.id)} className={`${buttonClass} mt-1`}>
                            Enregistrer
                          </SubmitButton>
                        </details>
                      </div>
                    )}
                  </td>
                  <td className={tdClass}>
                    {c.parent ? (
                      <>
                        <Link href={`/godmod/articles/${c.parent.id}`} className="text-text hover:text-accent">
                          {c.parent.title || "Sans titre"}
                        </Link>
                        <div className="mt-1 flex gap-3 text-xs">
                          <Link href={href({ article: c.parent.id, page: undefined })} className="text-accent hover:underline">
                            Filtrer
                          </Link>
                          <Link href={`/publication/${c.parent.id}`} className="text-accent hover:underline">
                            Voir
                          </Link>
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      <AdminPagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} hrefFor={(p) => href({ page: p })} />
    </>
  );
}
