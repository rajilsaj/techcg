import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { getDomain } from "@/lib/utils";
import { formatRelativeTime } from "@/i18n";
import { REGIONS, TOPICS, isRegion, isTopic } from "@/lib/topic-list";
import { AdminHeader, AdminPagination, Card, SearchForm, StatusTabs, adminHref } from "@/components/admin/ui";
import { MetaPicker } from "@/components/admin/MetaPicker";

export const dynamic = "force-dynamic";

const PER_PAGE = 30;
const META_SLUGS = TOPICS.map((t) => t.slug);

const VIEWS: Record<string, { label: string; where: Prisma.ItemWhereInput }> = {
  tous: { label: "Tous", where: {} },
  "sans-meta": { label: "Sans méta", where: { tags: { none: { tag: { slug: { in: META_SLUGS } } } } } },
  manuels: { label: "Choisis à la main", where: { metaManual: true } },
  congo: { label: "Congo", where: { tags: { some: { tag: { slug: "congo" } } } } },
  afrique: { label: "Afrique", where: { tags: { some: { tag: { slug: "afrique" } } } } },
  monde: { label: "Monde", where: { tags: { none: { tag: { slug: { in: REGIONS.map((r) => r.slug) } } } } } },
};

export default async function MetaBoardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminPage("/godmod/meta");
  const params = await searchParams;
  const view = params.vue && params.vue in VIEWS ? params.vue : "tous";
  const q = (params.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const base: Prisma.ItemWhereInput = { type: { in: ["story", "ask", "show", "job"] }, status: { not: "trash" } };
  const where: Prisma.ItemWhereInput = {
    AND: [base, VIEWS[view].where, q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { url: { contains: q, mode: "insensitive" } }] } : {}],
  };
  const [items, total, counts] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, title: true, url: true, createdAt: true, metaManual: true, tags: { select: { tag: { select: { slug: true } } } } },
    }),
    prisma.item.count({ where }),
    Promise.all(Object.entries(VIEWS).map(async ([key, v]) => [key, await prisma.item.count({ where: { AND: [base, v.where] } })] as const)),
  ]);
  const count = Object.fromEntries(counts);

  return (
    <>
      <AdminHeader
        title="Méta"
        description="Classez les articles : Startups, Entrepreneurs, Tech, Événements, et la région (Congo, Afrique, Monde) qui décide de leur place sur l'accueil. Les articles sont classés automatiquement ; un choix fait ici est gardé tel quel."
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusTabs
          tabs={Object.entries(VIEWS).map(([key, v]) => ({ key, label: v.label, count: count[key] }))}
          active={view}
          hrefFor={(key) => adminHref("/godmod/meta", { vue: key, q })}
        />
        <SearchForm action="/godmod/meta" query={q} keep={{ vue: view === "tous" ? undefined : view }} placeholder="Titre ou adresse…" />
      </div>

      <Card>
        {items.length === 0 ? (
          <p className="text-sm text-text-secondary">Aucun article dans cette vue.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const slugs = item.tags.map((t) => t.tag.slug);
              return (
                <li key={item.id} className="grid gap-2 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6">
                  <div className="min-w-0">
                    <Link href={`/godmod/articles/${item.id}`} className="line-clamp-2 text-sm font-medium text-text hover:text-accent">
                      {item.title || "Sans titre"}
                    </Link>
                    <p className="text-xs text-text-secondary">
                      {item.url ? getDomain(item.url) : "Texte"} · {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                  <MetaPicker
                    itemId={item.id}
                    compact
                    initial={{ topics: slugs.filter(isTopic), region: slugs.find(isRegion) ?? null, manual: item.metaManual }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <div className="mt-4">
        <AdminPagination
          page={page}
          pageCount={Math.max(1, Math.ceil(total / PER_PAGE))}
          total={total}
          hrefFor={(p) => adminHref("/godmod/meta", { vue: view, q, page: p })}
        />
      </div>
    </>
  );
}
