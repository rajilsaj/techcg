import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { formatLocalDateTime } from "@/lib/local-time";
import { AdminHeader, AdminPagination, StatusTabs, adminHref, tdClass, thClass } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const AREAS: Record<string, string> = {
  tous: "Tout",
  articles: "Articles",
  comments: "Commentaires",
  users: "Utilisateurs",
  category: "Catégories",
  tag: "Étiquettes",
  media: "Médias",
  settings: "Réglages",
};

/** Where an entry's target can be viewed in the admin. */
function targetHref(type: string | null, id: number | null): string | null {
  if (!id) return null;
  if (type === "item") return `/godmod/articles/${id}`;
  if (type === "user") return `/godmod/utilisateurs/${id}`;
  if (type === "comment") return `/godmod/commentaires`;
  if (type === "profile") return `/godmod/profils/${id}`;
  return null;
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ActivityLogPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/journal");
  const params = await searchParams;
  const area = params.zone && params.zone in AREAS ? params.zone : "tous";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const where = area === "tous" ? {} : { action: { startsWith: `${area}.` } };

  const [total, entries] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, action: true, summary: true, targetType: true, targetId: true, createdAt: true, actor: { select: { username: true } } },
    }),
  ]);

  const href = (overrides: Record<string, string | number | undefined>) => adminHref("/godmod/journal", { zone: area, ...overrides });

  return (
    <>
      <AdminHeader title="Journal" description="Toutes les actions effectuées dans l'administration." />
      <StatusTabs
        active={area}
        hrefFor={(key) => href({ zone: key, page: undefined })}
        tabs={Object.entries(AREAS).map(([key, label]) => ({ key, label, count: key === area ? total : undefined }))}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-bg">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className={`${thClass} w-48`}>Date</th>
              <th className={`${thClass} w-40`}>Administrateur</th>
              <th className={thClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className={`${tdClass} py-10 text-center text-text-secondary`}>
                  Aucune action enregistrée.
                </td>
              </tr>
            )}
            {entries.map((e) => {
              const link = targetHref(e.targetType, e.targetId);
              return (
                <tr key={e.id}>
                  <td className={`${tdClass} whitespace-nowrap text-xs text-text-secondary`}>{formatLocalDateTime(e.createdAt)}</td>
                  <td className={tdClass}>{e.actor?.username ?? "—"}</td>
                  <td className={tdClass}>
                    {link ? (
                      <Link href={link} className="text-text hover:text-accent">
                        {e.summary}
                      </Link>
                    ) : (
                      e.summary
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} hrefFor={(p) => href({ page: p })} />
    </>
  );
}
