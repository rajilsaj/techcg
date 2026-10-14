import type { Prisma } from "@prisma/client";
import { slugify } from "./taxonomy";

/** Profiles.CG lists Congolese people only: from either Congo. */
export const PROFILE_COUNTRIES = { CG: "Congo-Brazzaville", CD: "RD Congo" } as const;
export type ProfileCountry = keyof typeof PROFILE_COUNTRIES;

export function isProfileCountry(value: unknown): value is ProfileCountry {
  return typeof value === "string" && value in PROFILE_COUNTRIES;
}

/** Initials shown when a profile has no photo ("Grâce Mabiala" → "GM"). */
export function profileInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** First letter of a name for the A–Z index, without accents ("Élodie" → "E"); "#" for anything else. */
export function initialOf(name: string): string {
  const letter = name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(letter) ? letter : "#";
}

/** Only http(s) links are kept; anything else is dropped. */
function webUrl(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

const text = (value: FormDataEntryValue | null, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Validated profile fields from the admin form. */
export function profileFields(formData: FormData) {
  const name = text(formData.get("name"), 80);
  const country = formData.get("country");
  return {
    name,
    slug: slugify(text(formData.get("slug"), 80) || name),
    role: text(formData.get("role"), 80),
    organization: text(formData.get("organization"), 80) || null,
    city: text(formData.get("city"), 60) || null,
    country: isProfileCountry(country) ? country : "CG",
    photoUrl: webUrl(formData.get("photoUrl")),
    bio: String(formData.get("bio") ?? "").trim().slice(0, 2000) || null,
    website: webUrl(formData.get("website")),
    linkedin: webUrl(formData.get("linkedin")),
    twitter: webUrl(formData.get("twitter")),
    published: formData.get("published") === "on",
  };
}

/** Public directory filters, from the URL (?lettre=A&q=…). */
export function parseProfileFilters(params: Record<string, string | undefined>): { letter: string | null; q: string } {
  const letter = (params.lettre ?? "").toUpperCase();
  return {
    letter: LETTERS.includes(letter) ? letter : null,
    q: (params.q ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
  };
}

/** Search on name, role, organisation and city. The letter is applied in code (accents). */
export function profilesWhere(q: string): Prisma.ProfileWhereInput {
  const words = q.split(" ").filter(Boolean).slice(0, 6);
  return {
    published: true,
    AND: words.map((word) => ({
      OR: [
        { name: { contains: word, mode: "insensitive" } },
        { role: { contains: word, mode: "insensitive" } },
        { organization: { contains: word, mode: "insensitive" } },
        { city: { contains: word, mode: "insensitive" } },
      ],
    })),
  };
}
