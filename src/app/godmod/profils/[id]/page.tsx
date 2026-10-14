import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { AdminHeader, AdminNotice, Card, buttonClass } from "@/components/admin/ui";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { SubmitButton } from "@/components/admin/FormControls";
import { deleteProfileAction, updateProfileAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const id = parseInt((await params).id, 10);
  await requireAdminPage(`/godmod/profils/${id}`);
  const { notice } = await searchParams;
  const profile = Number.isInteger(id) ? await prisma.profile.findUnique({ where: { id } }) : null;
  if (!profile) notFound();

  return (
    <>
      <AdminHeader
        title={profile.name}
        description="Modifier ce profil de Profiles.CG."
        actions={
          <div className="flex items-center gap-3 text-sm">
            <Link href="/godmod/profils" className="text-text-secondary hover:text-accent">
              ← Tous les profils
            </Link>
            <Link href={`/profils/${profile.slug}`} className="text-accent hover:underline">
              Voir la page
            </Link>
          </div>
        }
      />
      <AdminNotice notice={notice} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <ProfileForm action={updateProfileAction} values={profile} submitLabel="Enregistrer" />
        </Card>
        <Card title="Supprimer">
          <form action={deleteProfileAction} className="space-y-2">
            <input type="hidden" name="id" value={profile.id} />
            <p className="text-sm text-text-secondary">Le profil disparaît de Profiles.CG. Pour le cacher sans le perdre, décochez « Visible ».</p>
            <SubmitButton className={`${buttonClass} border-red-500/50 text-red-600 hover:border-red-500 hover:text-red-600`} confirm={`Supprimer définitivement le profil de ${profile.name} ?`}>
              Supprimer le profil
            </SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
