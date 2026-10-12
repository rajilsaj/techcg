import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { formatLocalDateTime } from "@/lib/local-time";
import { SubmitButton } from "@/components/admin/FormControls";
import { AdminHeader, AdminNotice, AdminPagination, SearchForm, StatusTabs, adminHref, tdClass, thClass } from "@/components/admin/ui";
import { userAction } from "./actions";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;
const FILTERS: Record<string, { label: string; where: Prisma.UserWhereInput }> = {
  tous: { label: "Tous", where: {} },
  admins: { label: "Administrateurs", where: { isAdmin: true } },
  bannis: { label: "Suspendus", where: { banned: true } },
  masques: { label: "Masqués", where: { shadowBanned: true } },
  demo: { label: "Démo", where: { email: { endsWith: "@demo.invalid" } } },
};

const link = "text-xs text-accent hover:underline";
const danger = "text-xs text-red-500 hover:underline";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function UsersAdminPage({ searchParams }: PageProps) {
  const session = await requireAdminPage("/godmod/utilisateurs");
  const params = await searchParams;
  const filter = params.filtre && params.filtre in FILTERS ? params.filtre : "tous";
  const q = params.q?.trim() || undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const search: Prisma.UserWhereInput = q
    ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
    : {};
  const where: Prisma.UserWhereInput = { ...search, ...FILTERS[filter].where };

  const [counts, total, users] = await Promise.all([
    Promise.all(Object.entries(FILTERS).map(async ([key, f]) => [key, await prisma.user.count({ where: { ...search, ...f.where } })] as const)),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, username: true, email: true, phone: true, karma: true, isAdmin: true, banned: true, shadowBanned: true, createdAt: true },
    }),
  ]);

  const activity = await prisma.item.groupBy({
    by: ["authorId", "type"],
    where: { authorId: { in: users.map((u) => u.id) }, status: { not: "trash" } },
    _count: { _all: true },
  });
  const countFor = (userId: number, comments: boolean) =>
    activity.filter((a) => a.authorId === userId && (a.type === "comment") === comments).reduce((n, a) => n + a._count._all, 0);

  const href = (overrides: Record<string, string | number | undefined>) => adminHref("/godmod/utilisateurs", { filtre: filter, q, ...overrides });
  const currentUrl = href({ page });

  return (
    <>
      <AdminHeader title="Utilisateurs" description="Les membres s'inscrivent depuis le site ; seuls les administrateurs accèdent à cet espace." />
      <AdminNotice notice={params.notice} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusTabs
          active={filter}
          hrefFor={(key) => href({ filtre: key, page: undefined })}
          tabs={counts.map(([key, count]) => ({ key, label: FILTERS[key].label, count })).filter((t) => t.count > 0 || t.key === "tous" || t.key === filter)}
        />
        <SearchForm action="/godmod/utilisateurs" query={q} keep={{ filtre: filter === "tous" ? undefined : filter }} placeholder="Nom ou e-mail…" />
      </div>

      <form action={userAction}>
        <input type="hidden" name="back" value={currentUrl} />
        <div className="overflow-x-auto rounded-xl border border-border bg-bg">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Utilisateur</th>
                <th className={thClass}>Rôle</th>
                <th className={`${thClass} text-right`}>Karma</th>
                <th className={`${thClass} text-right`}>Articles</th>
                <th className={`${thClass} text-right`}>Comm.</th>
                <th className={thClass}>Inscription</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${tdClass} py-10 text-center text-text-secondary`}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const self = u.id === session.userId;
                return (
                  <tr key={u.id}>
                    <td className={tdClass}>
                      <Link href={`/godmod/utilisateurs/${u.id}`} className="font-medium text-text hover:text-accent">
                        {u.username}
                      </Link>
                      {self && <span className="ml-1 text-xs text-text-secondary">(vous)</span>}
                      <div className="text-xs text-text-secondary">{u.email ?? u.phone ?? "—"}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <Link href={`/godmod/utilisateurs/${u.id}`} className={link}>
                          Modifier
                        </Link>
                        <Link href={`/profil/${u.username}`} className={link}>
                          Profil
                        </Link>
                        {!self && (
                          <>
                            <SubmitButton name="row" value={`${u.isAdmin ? "demote" : "promote"}:${u.id}`} className={link}
                              confirm={u.isAdmin ? undefined : `Donner à ${u.username} un accès complet à l'administration ?`}>
                              {u.isAdmin ? "Retirer admin" : "Rendre admin"}
                            </SubmitButton>
                            <SubmitButton name="row" value={`${u.shadowBanned ? "unshadow" : "shadow"}:${u.id}`} className={link}>
                              {u.shadowBanned ? "Démasquer" : "Masquer"}
                            </SubmitButton>
                            <SubmitButton name="row" value={`${u.banned ? "unban" : "ban"}:${u.id}`} className={u.banned ? link : danger}>
                              {u.banned ? "Réactiver" : "Suspendre"}
                            </SubmitButton>
                            <SubmitButton name="row" value={`delete:${u.id}`} className={danger}
                              confirm={`Supprimer ${u.username} et TOUT son contenu (articles, commentaires, votes) ? Action définitive.`}>
                              Supprimer
                            </SubmitButton>
                          </>
                        )}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <span className={u.isAdmin ? "font-medium text-accent" : "text-text"}>{u.isAdmin ? "Administrateur" : "Membre"}</span>
                      {u.banned && <div className="text-xs text-red-500">Suspendu</div>}
                      {u.shadowBanned && <div className="text-xs text-amber-600">Masqué</div>}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{u.karma}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{countFor(u.id, false)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{countFor(u.id, true)}</td>
                    <td className={`${tdClass} whitespace-nowrap text-xs text-text-secondary`}>{formatLocalDateTime(u.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </form>

      <AdminPagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} hrefFor={(p) => href({ page: p })} />

      <p className="mt-6 text-xs text-text-secondary">
        <strong>Masquer</strong> : le membre continue à publier mais personne d&apos;autre ne voit ses contributions.{" "}
        <strong>Suspendre</strong> : le membre ne peut plus se connecter ni publier.
      </p>
    </>
  );
}
