import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { MEDIA_MAX_BYTES, MEDIA_TYPES, formatBytes, isBlobConfigured } from "@/lib/media";
import { formatLocalDateTime } from "@/lib/local-time";
import { SubmitButton } from "@/components/admin/FormControls";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { AdminHeader, AdminNotice, Card, buttonClass, inputClass } from "@/components/admin/ui";
import { deleteMediaAction, updateMediaAltAction } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function MediaLibraryPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/medias");
  const { notice } = await searchParams;
  const configured = isBlobConfigured();

  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, url: true, pathname: true, alt: true, size: true, createdAt: true, uploadedBy: { select: { username: true } } },
  });

  return (
    <>
      <AdminHeader title="Médias" description="Images stockées sur Vercel Blob, utilisables comme image d'article." />
      <AdminNotice notice={notice} />

      {configured ? (
        <div className="mb-6">
          <MediaUploader maxBytes={MEDIA_MAX_BYTES} types={MEDIA_TYPES} />
        </div>
      ) : (
        <div className="mb-6">
          <Card title="Stockage à configurer">
            <p className="text-sm text-text">Pour envoyer des images, reliez un stockage Vercel Blob au projet :</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
              <li>Sur vercel.com, ouvrez le projet <strong>techcg</strong> → onglet <strong>Storage</strong>.</li>
              <li>
                Cliquez <strong>Create Database</strong> → <strong>Blob</strong>, choisissez l&apos;accès <strong>Public</strong>, puis{" "}
                <strong>Connect</strong> au projet (environnements Production et Preview).
              </li>
              <li>Redéployez le site : cette page affichera alors la zone d&apos;envoi.</li>
            </ol>
          </Card>
        </div>
      )}

      {media.length === 0 ? (
        <p className="text-sm text-text-secondary">La médiathèque est vide.</p>
      ) : (
        <form>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {media.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-xl border border-border bg-bg">
                <a href={m.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Blob URLs */}
                  <img src={m.url} alt={m.alt} loading="lazy" className="aspect-video w-full object-cover" />
                </a>
                <div className="space-y-2 p-3 text-xs">
                  <p className="truncate text-text" title={m.pathname}>
                    {m.pathname.split("/").pop()}
                  </p>
                  <p className="text-text-secondary">
                    {formatBytes(m.size)} · {formatLocalDateTime(m.createdAt)}
                    {m.uploadedBy && ` · ${m.uploadedBy.username}`}
                  </p>
                  <input name={`alt-${m.id}`} defaultValue={m.alt} placeholder="Texte alternatif" aria-label="Texte alternatif" className={`${inputClass} py-1 text-xs`} />
                  <div className="flex items-center justify-between gap-2">
                    <SubmitButton formAction={updateMediaAltAction} name="altId" value={String(m.id)} className={`${buttonClass} px-2 py-1 text-xs`}>
                      Enregistrer
                    </SubmitButton>
                    <SubmitButton formAction={deleteMediaAction} name="deleteId" value={String(m.id)} className="text-red-500 hover:underline"
                      confirm="Supprimer cette image ? Les articles qui l'utilisent n'auront plus d'image.">
                      Supprimer
                    </SubmitButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </form>
      )}
    </>
  );
}
