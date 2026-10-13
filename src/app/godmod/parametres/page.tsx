import { requireAdminPage } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { listCategories } from "@/lib/taxonomy";
import { SubmitButton } from "@/components/admin/FormControls";
import { AdminHeader, AdminNotice, Card, inputClass, primaryButtonClass } from "@/components/admin/ui";
import { saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

const label = "mb-1 block text-sm font-medium text-text";
const hint = "mt-1 text-xs text-text-secondary";

const MODERATION = [
  { value: "none", label: "Publier tous les commentaires immédiatement" },
  { value: "first", label: "Valider le premier commentaire de chaque membre, puis publier les suivants" },
  { value: "all", label: "Valider chaque commentaire avant publication" },
];

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/parametres");
  const { notice } = await searchParams;
  const [settings, categories] = await Promise.all([getSettings(), listCategories()]);

  return (
    <>
      <AdminHeader title="Réglages" description="Paramètres généraux du site." />
      <AdminNotice notice={notice} />

      <form action={saveSettingsAction} className="max-w-2xl space-y-4">
        <Card title="Général">
          <div className="space-y-4">
            <div>
              <label htmlFor="siteName" className={label}>
                Nom du site
              </label>
              <input id="siteName" name="siteName" defaultValue={settings.siteName} required maxLength={60} className={inputClass} />
              <p className={hint}>Affiché dans l&apos;en-tête et l&apos;onglet du navigateur.</p>
            </div>
            <div>
              <label htmlFor="siteDescription" className={label}>
                Description
              </label>
              <textarea id="siteDescription" name="siteDescription" rows={3} maxLength={300} defaultValue={settings.siteDescription} className={inputClass} />
              <p className={hint}>Utilisée par les moteurs de recherche et lors des partages.</p>
            </div>
          </div>
        </Card>

        <Card title="Publication">
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm text-text">
              <input type="checkbox" name="submissionsOpen" defaultChecked={settings.submissionsOpen} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
              <span>
                Les membres peuvent publier
                <span className={`block ${hint}`}>Décochez pour fermer temporairement le formulaire « Publier ». Les administrateurs peuvent toujours publier.</span>
              </span>
            </label>
            <div>
              <label htmlFor="defaultCategoryId" className={label}>
                Catégorie par défaut
              </label>
              <select id="defaultCategoryId" name="defaultCategoryId" defaultValue={settings.defaultCategoryId ?? ""} className={inputClass}>
                <option value="">Aucune</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className={hint}>Attribuée aux publications pour lesquelles le membre n&apos;a pas choisi de catégorie.</p>
            </div>
          </div>
        </Card>

        <Card title="Commentaires">
          <fieldset className="space-y-2">
            <legend className="sr-only">Modération des commentaires</legend>
            {MODERATION.map((m) => (
              <label key={m.value} className="flex items-start gap-3 text-sm text-text">
                <input
                  type="radio"
                  name="commentModeration"
                  value={m.value}
                  defaultChecked={settings.commentModeration === m.value}
                  className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                />
                {m.label}
              </label>
            ))}
          </fieldset>
          <p className={hint}>Les commentaires en attente apparaissent dans Commentaires → En attente.</p>
        </Card>

        <Card title="Visiteurs">
          <label htmlFor="analyticsRetentionDays" className={label}>
            Durée de conservation des visites (jours)
          </label>
          <input
            id="analyticsRetentionDays"
            name="analyticsRetentionDays"
            type="number"
            min={1}
            max={730}
            defaultValue={settings.analyticsRetentionDays}
            className={`${inputClass} w-32`}
          />
          <p className={hint}>
            Les adresses IP, localisations et appareils plus anciens sont supprimés automatiquement. Ce sont des données personnelles :
            mentionnez leur collecte dans votre politique de confidentialité.
          </p>
        </Card>

        <SubmitButton className={primaryButtonClass}>Enregistrer les réglages</SubmitButton>
      </form>
    </>
  );
}
