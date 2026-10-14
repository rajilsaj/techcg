import { PROFILE_COUNTRIES } from "@/lib/profiles";
import { SubmitButton } from "@/components/admin/FormControls";
import { inputClass, primaryButtonClass } from "@/components/admin/ui";
import { ProfileLinkFiller } from "@/components/admin/ProfileLinkFiller";

export interface ProfileFormValues {
  id?: number;
  name: string;
  slug: string;
  role: string;
  organization: string | null;
  city: string | null;
  country: string;
  photoUrl: string | null;
  bio: string | null;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  published: boolean;
}

export const EMPTY_PROFILE: ProfileFormValues = {
  name: "",
  slug: "",
  role: "",
  organization: null,
  city: null,
  country: "CG",
  photoUrl: null,
  bio: null,
  website: null,
  linkedin: null,
  twitter: null,
  published: true,
};

const label = "mb-1 block text-xs font-medium text-text-secondary";

/** Add / edit a Profiles.CG entry. */
export function ProfileForm({
  action,
  values,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  values: ProfileFormValues;
  submitLabel: string;
}) {
  const id = values.id ?? "new";
  return (
    <>
      <ProfileLinkFiller formId={`profile-form-${id}`} />
      <form id={`profile-form-${id}`} action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <label className="min-w-0">
          <span className={label}>Nom complet *</span>
          <input id={`p-${id}-name`} name="name" required maxLength={80} defaultValue={values.name} className={inputClass} />
        </label>
        <label className="min-w-0">
          <span className={label}>Rôle (ex. Fondatrice, Développeur)</span>
          <input id={`p-${id}-role`} name="role" maxLength={80} defaultValue={values.role} className={inputClass} />
        </label>
        <label className="min-w-0">
          <span className={label}>Entreprise / organisation</span>
          <input id={`p-${id}-org`} name="organization" maxLength={80} defaultValue={values.organization ?? ""} className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0">
            <span className={label}>Ville</span>
            <input id={`p-${id}-city`} name="city" maxLength={60} defaultValue={values.city ?? ""} className={inputClass} />
          </label>
          <label className="min-w-0">
            <span className={label}>Pays</span>
            <select id={`p-${id}-country`} name="country" defaultValue={values.country} className={inputClass}>
              {Object.entries(PROFILE_COUNTRIES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="min-w-0 sm:col-span-2">
          <span className={label}>Photo (adresse https d&apos;une image ; sinon les initiales sont affichées)</span>
          <input
            id={`p-${id}-photo`}
            name="photoUrl"
            type="url"
            maxLength={500}
            defaultValue={values.photoUrl ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </label>
        <label className="min-w-0 sm:col-span-2">
          <span className={label}>Biographie</span>
          <textarea id={`p-${id}-bio`} name="bio" rows={4} maxLength={2000} defaultValue={values.bio ?? ""} className={inputClass} />
        </label>
        <label className="min-w-0">
          <span className={label}>Site web</span>
          <input
            id={`p-${id}-web`}
            name="website"
            maxLength={500}
            defaultValue={values.website ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </label>
        <label className="min-w-0">
          <span className={label}>LinkedIn</span>
          <input
            id={`p-${id}-li`}
            name="linkedin"
            maxLength={500}
            defaultValue={values.linkedin ?? ""}
            placeholder="https://linkedin.com/in/…"
            className={inputClass}
          />
        </label>
        <label className="min-w-0">
          <span className={label}>X (Twitter)</span>
          <input
            id={`p-${id}-x`}
            name="twitter"
            maxLength={500}
            defaultValue={values.twitter ?? ""}
            placeholder="https://x.com/…"
            className={inputClass}
          />
        </label>
        <label className="min-w-0">
          <span className={label}>Adresse de la page (slug, facultatif)</span>
          <input
            id={`p-${id}-slug`}
            name="slug"
            maxLength={80}
            defaultValue={values.slug}
            placeholder="généré depuis le nom"
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-text sm:col-span-2">
          <input id={`p-${id}-pub`} type="checkbox" name="published" defaultChecked={values.published} />
          Visible sur Profiles.CG
        </label>
        <div className="sm:col-span-2">
          <SubmitButton className={primaryButtonClass}>{submitLabel}</SubmitButton>
        </div>
      </form>
    </>
  );
}
