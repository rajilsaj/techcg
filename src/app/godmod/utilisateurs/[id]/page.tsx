import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { STATUS_LABELS, type ItemStatus } from "@/lib/content-status";
import { formatLocalDateTime } from "@/lib/local-time";
import { SubmitButton } from "@/components/admin/FormControls";
import { AdminHeader, AdminNotice, Card, StatusBadge, buttonClass, inputClass, primaryButtonClass } from "@/components/admin/ui";
import { updateUserAction, userAction } from "../actions";

export const dynamic = "force-dynamic";

const label = "mb-1 block text-sm font-medium text-text";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function EditUserPage({ params, searchParams }: PageProps) {
  const id = parseInt((await params).id, 10);
  const session = await requireAdminPage(`/godmod/utilisateurs/${id}`);
  const { notice } = await searchParams;

  const user = Number.isInteger(id)
    ? await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          about: true,
          karma: true,
          isAdmin: true,
          banned: true,
          shadowBanned: true,
          firebaseUid: true,
          passwordHash: true,
          createdAt: true,
          items: {
            where: { type: { not: "comment" } },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { id: true, title: true, status: true, createdAt: true },
          },
        },
      })
    : null;
  if (!user) notFound();
  const self = user.id === session.userId;
  const back = `/godmod/utilisateurs/${user.id}`;

  return (
    <>
      <AdminHeader
        title={user.username}
        description={`${user.isAdmin ? "Administrateur" : "Membre"} · inscrit le ${formatLocalDateTime(user.createdAt)}`}
        actions={
          <>
            <Link href="/godmod/utilisateurs" className={buttonClass}>
              ← Tous les utilisateurs
            </Link>
            <Link href={`/profil/${user.username}`} className={buttonClass}>
              Voir le profil
            </Link>
          </>
        }
      />
      <AdminNotice notice={notice} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <form action={updateUserAction} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />
          <Card title="Profil">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className={label}>
                  E-mail
                </label>
                <input id="email" name="email" type="email" defaultValue={user.email ?? ""} className={inputClass} />
              </div>
              <div>
                <label htmlFor="about" className={label}>
                  À propos
                </label>
                <textarea id="about" name="about" rows={4} defaultValue={user.about ?? ""} className={inputClass} />
              </div>
              <div>
                <label htmlFor="karma" className={label}>
                  Karma
                </label>
                <input id="karma" name="karma" type="number" defaultValue={user.karma} className={`${inputClass} w-32`} />
              </div>
              <SubmitButton className={primaryButtonClass}>Enregistrer</SubmitButton>
            </div>
          </Card>

          <Card title="Dernières publications">
            {user.items.length === 0 ? (
              <p className="text-sm text-text-secondary">Aucune publication.</p>
            ) : (
              <ul className="divide-y divide-border">
                {user.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/godmod/articles/${item.id}`} className="min-w-0 truncate text-text hover:text-accent">
                      {item.title || "Sans titre"}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
                      {item.status !== "published" && <StatusBadge status={item.status} label={STATUS_LABELS[item.status as ItemStatus] ?? item.status} />}
                      {formatLocalDateTime(item.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </form>

        <div className="space-y-4">
          <Card title="Compte">
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-text-secondary">Connexion</dt>
              <dd className="text-right">{user.firebaseUid ? "Google / téléphone" : user.passwordHash ? "Mot de passe" : "Aucune (démo)"}</dd>
              <dt className="text-text-secondary">Téléphone</dt>
              <dd className="text-right">{user.phone ?? "—"}</dd>
              <dt className="text-text-secondary">Statut</dt>
              <dd className={`text-right ${user.banned ? "text-red-500" : ""}`}>
                {user.banned ? "Suspendu" : user.shadowBanned ? "Masqué" : "Actif"}
              </dd>
            </dl>
          </Card>

          {!self && (
            <form action={userAction}>
              <input type="hidden" name="back" value={back} />
              <Card title="Actions">
                <div className="flex flex-col gap-2">
                  <SubmitButton name="row" value={`${user.isAdmin ? "demote" : "promote"}:${user.id}`} className={buttonClass}
                    confirm={user.isAdmin ? undefined : `Donner à ${user.username} un accès complet à l'administration ?`}>
                    {user.isAdmin ? "Retirer les droits d'administrateur" : "Rendre administrateur"}
                  </SubmitButton>
                  <SubmitButton name="row" value={`${user.shadowBanned ? "unshadow" : "shadow"}:${user.id}`} className={buttonClass}>
                    {user.shadowBanned ? "Démasquer" : "Masquer ses contributions"}
                  </SubmitButton>
                  <SubmitButton name="row" value={`${user.banned ? "unban" : "ban"}:${user.id}`} className={buttonClass}>
                    {user.banned ? "Réactiver le compte" : "Suspendre le compte"}
                  </SubmitButton>
                  <SubmitButton name="row" value={`delete:${user.id}`} className={`${buttonClass} border-red-500/50 text-red-500 hover:border-red-500 hover:text-red-500`}
                    confirm={`Supprimer ${user.username} et TOUT son contenu ? Action définitive.`}>
                    Supprimer le compte et son contenu
                  </SubmitButton>
                </div>
              </Card>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
