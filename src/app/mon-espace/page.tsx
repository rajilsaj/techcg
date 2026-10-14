import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowBigDown, ArrowBigUp, FileText, KeyRound, MessageCircle, MessagesSquare, ThumbsUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { STATUS_LABELS, isItemStatus } from "@/lib/content-status";
import { avatarUrl } from "@/lib/gravatar";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/user/Avatar";
import { formatRelativeTime } from "@/i18n";
import { ApiKeys } from "@/components/account/ApiKeys";
import { MAX_KEYS_PER_MEMBER } from "@/lib/api/keys";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon espace", robots: { index: false } };

/*
 * Every member's own space (not the admin): their publications, the comments
 * people left on them, their own comments, and the votes their publications got.
 */

const TABS = [
  { key: "publications", label: "Mes publications", icon: FileText },
  { key: "recus", label: "Commentaires reçus", icon: MessagesSquare },
  { key: "commentaires", label: "Mes commentaires", icon: MessageCircle },
  { key: "votes", label: "Votes reçus", icon: ThumbsUp },
  { key: "api", label: "Clés API", icon: KeyRound },
] as const;
type Tab = (typeof TABS)[number]["key"];

const LIMIT = 50;
/** Root publication id of a comment: its path starts with the publication's padded id. */
const rootId = (path: string) => parseInt(path.split(".")[0], 10);
const excerpt = (text: string | null, max = 220) => {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "published") return null;
  const tone = status === "pending" || status === "scheduled" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-bg-secondary text-text-secondary";
  return <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{isItemStatus(status) ? STATUS_LABELS[status] : status}</span>;
}

export default async function MySpacePage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/mon-espace");
  const { onglet } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === onglet) ? (onglet as Tab) : "publications";
  const me = session.userId;

  // My publications (every status: drafts and pending ones are mine to see).
  const stories = await prisma.item.findMany({
    where: { authorId: me, type: { not: "comment" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, url: true, path: true, status: true, points: true, commentCount: true, createdAt: true },
  });
  const storyIds = stories.map((s) => s.id);
  const titles = new Map(stories.map((s) => [s.id, s.title ?? "Sans titre"]));
  const onMine = stories.length ? { OR: stories.map((s) => ({ path: { startsWith: `${s.path}.` } })) } : { id: -1 };

  const [receivedCount, myCommentCount, votes, apiKeys] = await Promise.all([
    prisma.item.count({ where: { type: "comment", status: "published", authorId: { not: me }, ...onMine } }),
    prisma.item.count({ where: { type: "comment", authorId: me } }),
    prisma.vote.groupBy({ by: ["itemId", "value"], where: { itemId: { in: storyIds.length ? storyIds : [-1] }, userId: { not: me } }, _count: { _all: true } }),
    prisma.apiKey.findMany({ where: { userId: me }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true } }),
  ]);
  const ups = new Map<number, number>();
  const downs = new Map<number, number>();
  for (const v of votes) {
    const map = v.value > 0 ? ups : downs;
    map.set(v.itemId, (map.get(v.itemId) ?? 0) + v._count._all);
  }
  const totalUp = [...ups.values()].reduce((a, b) => a + b, 0);
  const totalDown = [...downs.values()].reduce((a, b) => a + b, 0);

  const received =
    tab === "recus"
      ? await prisma.item.findMany({
          where: { type: "comment", status: "published", authorId: { not: me }, ...onMine },
          orderBy: { createdAt: "desc" },
          take: LIMIT,
          select: { id: true, text: true, path: true, createdAt: true, author: { select: { username: true, email: true } } },
        })
      : [];
  const mine =
    tab === "commentaires"
      ? await prisma.item.findMany({
          where: { type: "comment", authorId: me },
          orderBy: { createdAt: "desc" },
          take: LIMIT,
          select: { id: true, text: true, path: true, status: true, createdAt: true },
        })
      : [];
  // Titles of the publications my comments are on (not necessarily mine).
  const otherIds = [...new Set(mine.map((c) => rootId(c.path)).filter((id) => !titles.has(id)))];
  if (otherIds.length) {
    for (const s of await prisma.item.findMany({ where: { id: { in: otherIds } }, select: { id: true, title: true } })) titles.set(s.id, s.title ?? "Sans titre");
  }

  const stats: { key: Tab; label: string; value: string }[] = [
    { key: "publications", label: "Publications", value: String(stories.length) },
    { key: "recus", label: "Commentaires reçus", value: String(receivedCount) },
    { key: "commentaires", label: "Mes commentaires", value: String(myCommentCount) },
    { key: "votes", label: "Votes reçus", value: `+${totalUp} / −${totalDown}` },
    { key: "api", label: "Clés API", value: String(apiKeys.length) },
  ];

  const row = "border-b border-border py-4";
  const empty = (text: string, cta?: { href: string; label: string }) => (
    <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-text-secondary">
      <p>{text}</p>
      {cta && (
        <Link href={cta.href} className="mt-3 inline-flex rounded-full bg-accent px-4 py-2 font-medium text-white hover:no-underline hover:opacity-90">
          {cta.label}
        </Link>
      )}
    </div>
  );

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-10">
        {/* Hello */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={session.avatarUrl} size={56} />
            <div>
              <p className="text-sm text-text-secondary">Mon espace</p>
              <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">Bonjour {session.username}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/profil/${session.username}`} className="rounded-full bg-bg-secondary px-4 py-2 text-sm font-medium text-text hover:bg-border hover:no-underline">
              Mon profil public
            </Link>
            <Link href="/publier" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:no-underline hover:opacity-90">
              Publier
            </Link>
          </div>
        </div>

        {/* Numbers, which are also the tabs */}
        <nav aria-label="Mon espace" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => {
            const Icon = TABS.find((t) => t.key === s.key)!.icon;
            const on = tab === s.key;
            return (
              <Link
                key={s.key}
                href={s.key === "publications" ? "/mon-espace" : `/mon-espace?onglet=${s.key}`}
                aria-current={on ? "page" : undefined}
                className={`rounded-2xl border p-4 transition-colors hover:no-underline ${on ? "border-text bg-text text-bg" : "border-border bg-bg text-text hover:border-text-secondary/50"}`}
              >
                <Icon size={18} aria-hidden className={on ? "" : "text-text-secondary"} />
                <p className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</p>
                <p className={`text-xs ${on ? "opacity-80" : "text-text-secondary"}`}>{s.label}</p>
              </Link>
            );
          })}
        </nav>

        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-text">{TABS.find((t) => t.key === tab)!.label}</h2>

          {tab === "publications" &&
            (stories.length === 0 ? (
              empty("Vous n'avez encore rien publié.", { href: "/publier", label: "Publier un article" })
            ) : (
              <ul>
                {stories.map((s) => (
                  <li key={s.id} className={`${row} flex flex-wrap items-center gap-x-4 gap-y-1`}>
                    <div className="min-w-0 flex-1">
                      <Link href={`/publication/${s.id}`} className="font-medium text-text hover:text-accent">
                        {s.title ?? "Sans titre"}
                      </Link>
                      <StatusBadge status={s.status} />
                      <p className="text-xs text-text-secondary">{formatRelativeTime(s.createdAt)}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-3 text-sm tabular-nums text-text-secondary">
                      <span title="Score">{s.points} pts</span>
                      <Link href={`/publication/${s.id}#commentaires`} className="inline-flex items-center gap-1 hover:text-accent">
                        <MessageCircle size={14} aria-hidden /> {s.commentCount}
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "recus" &&
            (received.length === 0 ? (
              empty(stories.length ? "Personne n'a encore commenté vos publications." : "Publiez un article pour recevoir des commentaires.")
            ) : (
              <ul>
                {received.map((c) => (
                  <li key={c.id} className={row}>
                    <p className="flex items-center gap-2 text-xs text-text-secondary">
                      <Avatar src={avatarUrl(c.author.email, c.author.username)} size={18} />
                      <Link href={`/profil/${c.author.username}`} className="font-medium text-text hover:text-accent">
                        {c.author.username}
                      </Link>
                      · {formatRelativeTime(c.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-text">{excerpt(c.text)}</p>
                    <Link href={`/publication/${rootId(c.path)}#commentaires`} className="mt-1 inline-block text-xs text-accent hover:underline">
                      sur « {titles.get(rootId(c.path))} » →
                    </Link>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "commentaires" &&
            (mine.length === 0 ? (
              empty("Vous n'avez pas encore commenté.", { href: "/", label: "Découvrir les articles" })
            ) : (
              <ul>
                {mine.map((c) => (
                  <li key={c.id} className={row}>
                    <p className="text-xs text-text-secondary">
                      {formatRelativeTime(c.createdAt)}
                      <StatusBadge status={c.status} />
                    </p>
                    <p className="mt-1 text-sm text-text">{excerpt(c.text)}</p>
                    <Link href={`/publication/${rootId(c.path)}#commentaires`} className="mt-1 inline-block text-xs text-accent hover:underline">
                      sur « {titles.get(rootId(c.path)) ?? "une publication"} » →
                    </Link>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "votes" &&
            (stories.length === 0 ? (
              empty("Publiez un article pour recevoir des votes.", { href: "/publier", label: "Publier un article" })
            ) : (
              <>
                <p className="mb-2 text-xs text-text-secondary">Les votes sont anonymes : vous voyez combien de membres ont voté pour ou contre chaque publication.</p>
                <ul>
                  {stories.map((s) => (
                    <li key={s.id} className={`${row} flex items-center gap-4`}>
                      <Link href={`/publication/${s.id}`} className="min-w-0 flex-1 truncate font-medium text-text hover:text-accent">
                        {s.title ?? "Sans titre"}
                      </Link>
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm tabular-nums text-text">
                        <ArrowBigUp size={16} aria-label="Pour" /> {ups.get(s.id) ?? 0}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm tabular-nums text-text-secondary">
                        <ArrowBigDown size={16} aria-label="Contre" /> {downs.get(s.id) ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ))}

          {tab === "api" && (
            <ApiKeys
              max={MAX_KEYS_PER_MEMBER}
              keys={apiKeys.map((k) => ({ ...k, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null }))}
            />
          )}
        </section>
      </div>
    </>
  );
}
