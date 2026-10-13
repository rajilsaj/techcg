import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { ITEM_STATUSES, STATUS_LABELS, STATUS_TAB_LABELS, isItemStatus, type ItemStatus } from "@/lib/content-status";
import { formatLocalDateTime } from "@/lib/local-time";
import { listCategories } from "@/lib/taxonomy";
import { getDomain } from "@/lib/utils";
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
  tdClass,
  thClass,
} from "@/components/admin/ui";
import { bulkArticlesAction } from "./actions";
import { Flag } from "lucide-react";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;
const POST_TYPES = ["story", "ask", "show", "job"];
const TYPE_LABELS: Record<string, string> = { story: "Article", ask: "Question", show: "Vitrine", job: "Emploi" };
const ARTICLE_STATUSES = ITEM_STATUSES.filter((s) => s !== "spam");

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ArticlesAdminPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/articles");
  const params = await searchParams;
  const status = isItemStatus(params.statut) ? params.statut : "tous";
  const q = params.q?.trim() || undefined;
  const categorie = params.categorie && /^\d+$/.test(params.categorie) ? params.categorie : undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const base: Prisma.ItemWhereInput = {
    type: { in: POST_TYPES },
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { url: { contains: q, mode: "insensitive" } }] } : {}),
    ...(categorie ? { categoryId: parseInt(categorie, 10) } : {}),
  };
  // "Tous" leaves the trash out, as in WordPress.
  const where: Prisma.ItemWhereInput = { ...base, status: status === "tous" ? { not: "trash" } : status };

  const [counts, total, articles, categories] = await Promise.all([
    prisma.item.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        type: true,
        title: true,
        url: true,
        status: true,
        points: true,
        commentCount: true,
        flagCount: true,
        createdAt: true,
        publishAt: true,
        author: { select: { username: true } },
        category: { select: { name: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    }),
    listCategories(),
  ]);

  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const filters = { statut: status, q, categorie };
  const href = (overrides: Record<string, string | number | undefined>) => adminHref("/godmod/articles", { ...filters, ...overrides });
  const currentUrl = href({ page });
  const inTrash = status === "trash";

  return (
    <>
      <AdminHeader title="Articles" description="Tout le contenu publié par les membres via le formulaire « Publier »." />
      <AdminNotice notice={params.notice} />

      <StatusTabs
        active={status}
        hrefFor={(key) => href({ statut: key, page: undefined })}
        tabs={[
          { key: "tous", label: "Tous", count: counts.filter((c) => c.status !== "trash").reduce((n, c) => n + c._count._all, 0) },
          ...ARTICLE_STATUSES.map((s) => ({ key: s, label: STATUS_TAB_LABELS[s], count: countOf(s) })).filter((t) => t.count > 0 || t.key === status),
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <form action="/godmod/articles" method="get" className="flex items-center gap-2">
          {status !== "tous" && <input type="hidden" name="statut" value={status} />}
          {q && <input type="hidden" name="q" value={q} />}
          <select name="categorie" defaultValue={categorie ?? ""} className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text">
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass}>
            Filtrer
          </button>
        </form>
        <SearchForm action="/godmod/articles" query={q} keep={{ statut: status === "tous" ? undefined : status, categorie }} placeholder="Titre ou adresse…" />
      </div>

      <form action={bulkArticlesAction}>
        <input type="hidden" name="back" value={currentUrl} />
        <div className="mb-3 flex items-center gap-2">
          <select name="bulk" defaultValue="" className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" aria-label="Action groupée">
            <option value="">Actions groupées</option>
            {inTrash ? (
              <>
                <option value="restore">Restaurer</option>
                <option value="delete">Supprimer définitivement</option>
              </>
            ) : (
              <>
                <option value="published">Publier</option>
                <option value="draft">Mettre en brouillon</option>
                <option value="pending">Mettre en attente</option>
                <option value="trash">Déplacer dans la corbeille</option>
              </>
            )}
          </select>
          <SubmitButton className={buttonClass} confirm={inTrash ? "Appliquer cette action aux articles sélectionnés ? La suppression est définitive." : undefined}>
            Appliquer
          </SubmitButton>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-bg">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className={`${thClass} w-10`}>
                  <SelectAll />
                </th>
                <th className={thClass}>Titre</th>
                <th className={thClass}>Auteur</th>
                <th className={thClass}>Catégorie / étiquettes</th>
                <th className={`${thClass} text-right`}>Points</th>
                <th className={`${thClass} text-right`}>Comm.</th>
                <th className={thClass}>Date</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${tdClass} py-10 text-center text-text-secondary`}>
                    Aucun article trouvé.
                  </td>
                </tr>
              )}
              {articles.map((a) => (
                <tr key={a.id} className="group hover:bg-bg-secondary/60">
                  <td className={tdClass}>
                    <input type="checkbox" name="ids" value={a.id} aria-label={`Sélectionner « ${a.title} »`} className="h-4 w-4 accent-[var(--accent)]" />
                  </td>
                  <td className={tdClass}>
                    <Link href={`/godmod/articles/${a.id}`} className="font-medium text-text hover:text-accent">
                      {a.title || "Sans titre"}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                      {a.status !== "published" && <StatusBadge status={a.status} label={STATUS_LABELS[a.status as ItemStatus] ?? a.status} />}
                      {a.type !== "story" && <span>{TYPE_LABELS[a.type] ?? a.type}</span>}
                      {a.url && <span>{getDomain(a.url)}</span>}
                      {a.flagCount > 0 && <span className="inline-flex items-center gap-1 text-red-500" title="Signalements"><Flag size={12} aria-hidden />{a.flagCount}</span>}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <Link href={`/godmod/articles/${a.id}`} className="text-accent hover:underline">
                        Modifier
                      </Link>
                      <Link href={`/publication/${a.id}`} className="text-accent hover:underline">
                        Voir
                      </Link>
                    </div>
                  </td>
                  <td className={`${tdClass} text-text-secondary`}>{a.author.username}</td>
                  <td className={`${tdClass} text-text-secondary`}>
                    <span className="text-text">{a.category?.name ?? "—"}</span>
                    {a.tags.length > 0 && <div className="mt-0.5 text-xs">{a.tags.map((t) => t.tag.name).join(", ")}</div>}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{a.points}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{a.commentCount}</td>
                  <td className={`${tdClass} whitespace-nowrap text-xs text-text-secondary`}>
                    {a.status === "scheduled" ? "Programmé" : a.status === "published" ? "Publié" : "Modifié"}
                    <br />
                    {formatLocalDateTime(a.status === "scheduled" && a.publishAt ? a.publishAt : a.createdAt)}
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
