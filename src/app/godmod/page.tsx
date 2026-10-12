import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { STATUS_LABELS, type ItemStatus } from "@/lib/content-status";
import { AdminHeader, Card, StatusBadge } from "@/components/admin/ui";
import { formatRelativeTime } from "@/i18n";

export const dynamic = "force-dynamic";

const POST_TYPES = ["story", "ask", "show", "job"];

export default async function AdminDashboard() {
  await requireAdminPage("/godmod");

  const [postCounts, commentCounts, members, banned, categories, flagged, recentPosts, recentComments, activity] =
    await Promise.all([
      prisma.item.groupBy({ by: ["status"], where: { type: { in: POST_TYPES } }, _count: { _all: true } }),
      prisma.item.groupBy({ by: ["status"], where: { type: "comment" }, _count: { _all: true } }),
      prisma.user.count(),
      prisma.user.count({ where: { banned: true } }),
      prisma.category.count(),
      prisma.item.findMany({
        where: { type: { in: POST_TYPES }, flagCount: { gt: 0 }, status: { not: "trash" } },
        orderBy: { flagCount: "desc" },
        take: 5,
        select: { id: true, title: true, flagCount: true },
      }),
      prisma.item.findMany({
        where: { type: { in: POST_TYPES } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, title: true, status: true, createdAt: true, author: { select: { username: true } } },
      }),
      prisma.item.findMany({
        where: { type: "comment", status: { not: "trash" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          text: true,
          status: true,
          createdAt: true,
          author: { select: { username: true } },
          parent: { select: { id: true, title: true } },
        },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, summary: true, createdAt: true, actor: { select: { username: true } } },
      }),
    ]);

  const count = (rows: { status: string; _count: { _all: number } }[], status: string) =>
    rows.find((r) => r.status === status)?._count._all ?? 0;
  const pendingComments = count(commentCounts, "pending");

  const glance: { label: string; value: number; href: string }[] = [
    { label: "Articles publiés", value: count(postCounts, "published"), href: "/godmod/articles?statut=published" },
    { label: "Brouillons", value: count(postCounts, "draft"), href: "/godmod/articles?statut=draft" },
    { label: "Programmés", value: count(postCounts, "scheduled"), href: "/godmod/articles?statut=scheduled" },
    { label: "Commentaires", value: count(commentCounts, "published"), href: "/godmod/commentaires" },
    { label: "Membres", value: members, href: "/godmod/utilisateurs" },
    { label: "Catégories", value: categories, href: "/godmod/categories" },
  ];

  return (
    <>
      <AdminHeader title="Tableau de bord" description="Vue d'ensemble du site et de ce qui demande votre attention." />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="En un coup d'œil">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {glance.map((g) => (
                <li key={g.label}>
                  <Link href={g.href} className="block rounded-lg border border-border p-3 transition-colors hover:border-accent">
                    <span className="block text-2xl font-semibold tabular-nums text-text">{g.value}</span>
                    <span className="text-xs text-text-secondary">{g.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Articles récents" actions={<Link href="/godmod/articles" className="text-xs text-accent hover:underline">Tous les articles</Link>}>
            <ul className="divide-y divide-border">
              {recentPosts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/godmod/articles/${post.id}`} className="min-w-0 truncate text-text hover:text-accent">
                    {post.title || "Sans titre"}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
                    {post.status !== "published" && <StatusBadge status={post.status} label={STATUS_LABELS[post.status as ItemStatus] ?? post.status} />}
                    {post.author.username} · {formatRelativeTime(post.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Commentaires récents" actions={<Link href="/godmod/commentaires" className="text-xs text-accent hover:underline">Tous les commentaires</Link>}>
            {recentComments.length === 0 ? (
              <p className="text-sm text-text-secondary">Aucun commentaire.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentComments.map((c) => (
                  <li key={c.id} className="py-2 text-sm">
                    <p className="text-xs text-text-secondary">
                      <span className="font-medium text-text">{c.author.username}</span> sur{" "}
                      <Link href={`/godmod/articles/${c.parent?.id}`} className="text-accent hover:underline">
                        {c.parent?.title || "une publication"}
                      </Link>{" "}
                      · {formatRelativeTime(c.createdAt)}{" "}
                      {c.status !== "published" && <StatusBadge status={c.status} label={STATUS_LABELS[c.status as ItemStatus] ?? c.status} />}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-text">{c.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="À modérer">
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/godmod/commentaires?statut=pending" className="flex justify-between text-text hover:text-accent">
                  Commentaires en attente
                  <span className={pendingComments ? "font-semibold text-red-500" : "text-text-secondary"}>{pendingComments}</span>
                </Link>
              </li>
              <li>
                <Link href="/godmod/commentaires?statut=spam" className="flex justify-between text-text hover:text-accent">
                  Indésirables <span className="text-text-secondary">{count(commentCounts, "spam")}</span>
                </Link>
              </li>
              <li>
                <Link href="/godmod/articles?statut=pending" className="flex justify-between text-text hover:text-accent">
                  Articles en attente (signalés) <span className="text-text-secondary">{count(postCounts, "pending")}</span>
                </Link>
              </li>
              <li>
                <Link href="/godmod/utilisateurs?filtre=bannis" className="flex justify-between text-text hover:text-accent">
                  Membres suspendus <span className="text-text-secondary">{banned}</span>
                </Link>
              </li>
            </ul>
            {flagged.length > 0 && (
              <>
                <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">Les plus signalés</p>
                <ul className="space-y-1 text-sm">
                  {flagged.map((f) => (
                    <li key={f.id} className="flex justify-between gap-2">
                      <Link href={`/godmod/articles/${f.id}`} className="truncate text-text hover:text-accent">
                        {f.title || "Sans titre"}
                      </Link>
                      <span className="shrink-0 text-red-500">⚑ {f.flagCount}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card title="Activité récente" actions={<Link href="/godmod/journal" className="text-xs text-accent hover:underline">Journal</Link>}>
            {activity.length === 0 ? (
              <p className="text-sm text-text-secondary">Aucune action pour le moment.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activity.map((a) => (
                  <li key={a.id}>
                    <p className="text-text">{a.summary}</p>
                    <p className="text-xs text-text-secondary">
                      {a.actor?.username ?? "—"} · {formatRelativeTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
