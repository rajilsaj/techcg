import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { STATUS_LABELS, ITEM_STATUSES } from "@/lib/content-status";
import { formatLocalDateTime, toLocalInput } from "@/lib/local-time";
import { listCategories } from "@/lib/taxonomy";
import { SubmitButton } from "@/components/admin/FormControls";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { AdminHeader, AdminNotice, Card, StatusBadge, buttonClass, inputClass, primaryButtonClass } from "@/components/admin/ui";
import { bulkArticlesAction, clearFlagsAction, updateArticleAction } from "../actions";

export const dynamic = "force-dynamic";

const POST_TYPES = ["story", "ask", "show", "job"];
const TYPE_LABELS: Record<string, string> = { story: "Article", ask: "Question", show: "Vitrine", job: "Emploi" };
const label = "mb-1 block text-sm font-medium text-text";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function EditArticlePage({ params, searchParams }: PageProps) {
  const id = parseInt((await params).id, 10);
  await requireAdminPage(`/godmod/articles/${id}`);
  const { notice } = await searchParams;

  const [article, categories, media] = await Promise.all([
    Number.isInteger(id)
      ? prisma.item.findUnique({
          where: { id },
          select: {
            id: true,
            type: true,
            title: true,
            url: true,
            text: true,
            excerpt: true,
            imageUrl: true,
            status: true,
            publishAt: true,
            categoryId: true,
            points: true,
            commentCount: true,
            flagCount: true,
            createdAt: true,
            updatedAt: true,
            author: { select: { username: true } },
            tags: { select: { tag: { select: { name: true } } } },
          },
        })
      : null,
    listCategories(),
    prisma.media.findMany({
      where: { contentType: { startsWith: "image/" } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, url: true, alt: true },
    }),
  ]);
  if (!article || !POST_TYPES.includes(article.type)) notFound();

  const statuses = ITEM_STATUSES.filter((s) => s !== "spam");

  return (
    <>
      <AdminHeader
        title="Modifier l'article"
        actions={
          <>
            <Link href="/godmod/articles" className={buttonClass}>
              ← Tous les articles
            </Link>
            <Link href={`/publication/${article.id}`} className={buttonClass}>
              Voir sur le site
            </Link>
          </>
        }
      />
      <AdminNotice notice={notice} />

      <form action={updateArticleAction} className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <input type="hidden" name="id" value={article.id} />

        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className={label}>
                  Titre
                </label>
                <input id="title" name="title" defaultValue={article.title ?? ""} required maxLength={500} className={`${inputClass} text-lg font-medium`} />
              </div>
              <div>
                <label htmlFor="url" className={label}>
                  Adresse (URL)
                </label>
                <input id="url" name="url" type="url" defaultValue={article.url ?? ""} placeholder="https://…" className={inputClass} />
              </div>
              <div>
                <label htmlFor="text" className={label}>
                  Texte
                </label>
                <textarea id="text" name="text" rows={8} defaultValue={article.text ?? ""} className={inputClass} />
              </div>
              <div>
                <label htmlFor="excerpt" className={label}>
                  Extrait de l&apos;article
                </label>
                <textarea id="excerpt" name="excerpt" rows={3} defaultValue={article.excerpt ?? ""} className={inputClass} />
                <p className="mt-1 text-xs text-text-secondary">Affiché sous le titre dans les listes. En français.</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Publication">
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-text-secondary">
                Statut actuel : <StatusBadge status={article.status} label={STATUS_LABELS[article.status as keyof typeof STATUS_LABELS] ?? article.status} />
              </p>
              <div>
                <label htmlFor="status" className={label}>
                  Statut
                </label>
                <select id="status" name="status" defaultValue={article.status} className={inputClass}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="publishAt" className={label}>
                  Date de publication programmée
                </label>
                <input id="publishAt" name="publishAt" type="datetime-local" defaultValue={toLocalInput(article.publishAt)} className={inputClass} />
                <p className="mt-1 text-xs text-text-secondary">Utilisée avec le statut « Programmé ». Heure de Brazzaville.</p>
              </div>
              <div>
                <label htmlFor="type" className={label}>
                  Type
                </label>
                <select id="type" name="type" defaultValue={article.type} className={inputClass}>
                  {POST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {article.status !== "trash" ? (
                  <SubmitButton formAction={bulkArticlesAction} name="bulk" value="trash" className="text-sm text-red-500 hover:underline">
                    Mettre à la corbeille
                  </SubmitButton>
                ) : (
                  <span />
                )}
                <SubmitButton className={primaryButtonClass}>Mettre à jour</SubmitButton>
              </div>
              {/* Used by the trash button above, which posts to the bulk action. */}
              <input type="hidden" name="ids" value={article.id} />
              <input type="hidden" name="back" value="/godmod/articles" />
            </div>
          </Card>

          <Card title="Catégorie">
            <select name="categoryId" defaultValue={article.categoryId ?? ""} className={inputClass} aria-label="Catégorie">
              <option value="">Aucune</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Link href="/godmod/categories" className="mt-2 inline-block text-xs text-accent hover:underline">
              Gérer les catégories
            </Link>
          </Card>

          <Card title="Étiquettes">
            <input
              name="tags"
              defaultValue={article.tags.map((t) => t.tag.name).join(", ")}
              placeholder="ia, cloud, startups"
              className={inputClass}
              aria-label="Étiquettes"
            />
            <p className="mt-1 text-xs text-text-secondary">Séparées par des virgules, 5 au maximum.</p>
          </Card>

          <Card title="Image">
            <ImagePicker name="imageUrl" defaultValue={article.imageUrl ?? ""} media={media} />
          </Card>

          <Card title="Informations">
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-text-secondary">Auteur</dt>
              <dd className="text-right">
                <Link href={`/profil/${article.author.username}`} className="text-accent hover:underline">
                  {article.author.username}
                </Link>
              </dd>
              <dt className="text-text-secondary">Date</dt>
              <dd className="text-right">{formatLocalDateTime(article.createdAt)}</dd>
              <dt className="text-text-secondary">Modifié</dt>
              <dd className="text-right">{formatLocalDateTime(article.updatedAt)}</dd>
              <dt className="text-text-secondary">Points</dt>
              <dd className="text-right tabular-nums">{article.points}</dd>
              <dt className="text-text-secondary">Commentaires</dt>
              <dd className="text-right tabular-nums">
                <Link href={`/godmod/commentaires?article=${article.id}`} className="text-accent hover:underline">
                  {article.commentCount}
                </Link>
              </dd>
              <dt className="text-text-secondary">Signalements</dt>
              <dd className={`text-right tabular-nums ${article.flagCount ? "text-red-500" : ""}`}>{article.flagCount}</dd>
            </dl>
            {article.flagCount > 0 && (
              <SubmitButton formAction={clearFlagsAction} className={`${buttonClass} mt-3 w-full`}>
                Effacer les signalements
              </SubmitButton>
            )}
          </Card>
        </div>
      </form>
    </>
  );
}
