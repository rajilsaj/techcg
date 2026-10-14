import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { PROFILE_COUNTRIES, isProfileCountry, profileInitials } from "@/lib/profiles";
import { ProfilePhoto } from "@/components/profiles/ProfilePhoto";
import { AdminHeader, AdminNotice, Card, tdClass, thClass } from "@/components/admin/ui";
import { EMPTY_PROFILE, ProfileForm } from "@/components/admin/ProfileForm";
import { createProfileAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilesAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminPage("/godmod/profils");
  const { notice } = await searchParams;
  const profiles = await prisma.profile.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, role: true, organization: true, city: true, country: true, photoUrl: true, published: true },
  });

  return (
    <>
      <AdminHeader
        title="Profiles.CG"
        description="L'annuaire public des talents congolais de la tech (Congo-Brazzaville et RD Congo). Les profils sont classés de A à Z."
        actions={
          <Link href="/profils" className="text-sm text-accent hover:underline">
            Voir la page publique
          </Link>
        }
      />
      <AdminNotice notice={notice} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card title={`${profiles.length} profil${profiles.length > 1 ? "s" : ""}`}>
          {profiles.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucun profil pour l&apos;instant. Ajoutez le premier avec le formulaire.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thClass}>Nom</th>
                    <th className={thClass}>Rôle</th>
                    <th className={thClass}>Lieu</th>
                    <th className={thClass}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id}>
                      <td className={tdClass}>
                        <Link href={`/godmod/profils/${p.id}`} className="flex items-center gap-2 font-medium text-text hover:text-accent">
                          <ProfilePhoto src={p.photoUrl} initials={profileInitials(p.name)} textClass="text-[10px]" className="h-7 w-7 shrink-0 rounded-full" />
                          {p.name}
                        </Link>
                      </td>
                      <td className={`${tdClass} text-text-secondary`}>{[p.role, p.organization].filter(Boolean).join(" · ")}</td>
                      <td className={`${tdClass} text-text-secondary`}>
                        {[p.city, isProfileCountry(p.country) ? PROFILE_COUNTRIES[p.country] : p.country].filter(Boolean).join(", ")}
                      </td>
                      <td className={tdClass}>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.published ? "bg-green-600/15 text-green-600" : "bg-bg-secondary text-text-secondary"}`}>
                          {p.published ? "Visible" : "Masqué"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Ajouter un profil">
          <ProfileForm action={createProfileAction} values={EMPTY_PROFILE} submitLabel="Ajouter le profil" />
        </Card>
      </div>
    </>
  );
}
