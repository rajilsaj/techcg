import { decodeEntities, fetchPublic, parseMetadata, type PreviewFailure } from "./link-preview";
import type { ProfileCountry } from "./profiles";

/** What can be read from a talent's LinkedIn page or website, to pre-fill a profile. */
export interface ProfileDraft {
  name: string | null;
  role: string | null;
  organization: string | null;
  city: string | null;
  country: ProfileCountry | null;
  photoUrl: string | null;
  bio: string | null;
  website: string | null;
  linkedin: string | null;
}

const FAILURES: Record<PreviewFailure, string> = {
  invalid: "Adresse invalide.",
  blocked: "Adresse non publique.",
  not_found: "Page introuvable (404).",
  server_error: "Le site a refusé ou n'a pas répondu (erreur serveur).",
  restricted: "Le site refuse l'accès à cette page.",
  timeout: "Le site ne répond pas (délai dépassé).",
  unreachable: "Connexion impossible.",
};

// LinkedIn only shows a public profile's preview (name, headline, photo) to link-preview robots.
const PREVIEW_BOT = "Twitterbot/1.0";
const MAX_BYTES = 300 * 1024; // the useful part is in <head>

const clean = (value: string | null | undefined, max: number) => {
  const text = decodeEntities(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};

export function isLinkedInProfile(url: URL): boolean {
  return /(^|\.)linkedin\.com$/i.test(url.hostname) && /^\/in\/[^/]+/i.test(url.pathname);
}

/** Congo-Brazzaville or RD Congo from a place name, else null. */
export function countryOf(place: string | null): ProfileCountry | null {
  if (!place) return null;
  const p = place.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/democratic|democratique|\brdc\b|rd congo|kinshasa|lubumbashi|goma|bukavu|kisangani|congo \(kinshasa\)/.test(p)) return "CD";
  if (/republic of the congo|republique du congo|congo-brazzaville|brazzaville|pointe-noire|pointe noire|dolisie|congo \(brazzaville\)|^congo$/.test(p)) return "CG";
  return null;
}

/** "Nelson Cishugi - Lopango | LinkedIn" + "Headline · Experience: Lopango · Location: …" */
export function parseLinkedIn(title: string | null, description: string | null, image: string | null, url: URL): ProfileDraft {
  const heading = (title ?? "").replace(/\s*\|\s*LinkedIn\s*$/i, "");
  const [namePart, ...orgParts] = heading.split(/\s+[-–]\s+/);

  const fields: Record<string, string> = {};
  let headline: string | null = null;
  for (const part of (description ?? "").split(/\s+·\s+/)) {
    const m = part.match(/^(Experience|Expérience|Education|Formation|Location|Lieu|Localisation)\s*:\s*(.+)$/i);
    if (m) fields[m[1].toLowerCase()] = m[2].trim();
    else if (!headline && !/connections|relations|View .+ profile|Voir le profil/i.test(part)) headline = part.trim();
  }
  const place = fields.location ?? fields.lieu ?? fields.localisation ?? null;
  const placeParts = place?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  // A short headline ("Développeur chez X") is the role; a long or cut one ("…") is the start of the bio.
  const shortHeadline = headline && headline.length <= 80 && !/…$|\.\.\.$/.test(headline) ? headline : null;

  return {
    name: clean(namePart, 80),
    role: clean(shortHeadline, 80),
    organization: clean(fields.experience ?? fields["expérience"] ?? orgParts.join(" - "), 80),
    // "Brazzaville, Republic of the Congo" → Brazzaville; "Raleigh" → Raleigh; "Republic of the Congo" → no city.
    city: clean(placeParts.length > 1 || !/congo|republic|république|rdc/i.test(place ?? "") ? placeParts[0] : null, 60),
    country: countryOf(place),
    // LinkedIn's grey silhouette isn't a photo.
    photoUrl: image && !/ghost|static\.licdn\.com\/aero/i.test(image) ? image : null,
    bio: shortHeadline ? null : clean(headline, 2000),
    website: null,
    linkedin: `https://www.linkedin.com${url.pathname.replace(/\/+$/, "")}`,
  };
}

interface JsonLdPerson {
  name?: string;
  jobTitle?: string | string[];
  worksFor?: { name?: string } | { name?: string }[];
  image?: string | { url?: string } | (string | { url?: string })[];
  description?: string;
  address?: { addressLocality?: string; addressCountry?: string | { name?: string } };
  sameAs?: string | string[];
}

/** The first schema.org Person in the page's JSON-LD, if any. */
function jsonLdPerson(html: string): JsonLdPerson | null {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const nodes: unknown[] = Array.isArray(data) ? data : data?.["@graph"] ?? [data];
      for (const node of nodes) {
        const n = node as { "@type"?: string | string[] } & JsonLdPerson;
        const types = Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]];
        if (types.includes("Person") && n.name) return n;
      }
    } catch {
      // invalid JSON-LD: ignore
    }
  }
  return null;
}

const first = <T,>(value: T | T[] | undefined): T | undefined => (Array.isArray(value) ? value[0] : value);

/** A personal or company website: JSON-LD Person first, then the page title, description and image. */
export function parseWebsite(html: string, url: URL): ProfileDraft {
  const meta = parseMetadata(html, url);
  const person = jsonLdPerson(html);
  const linkedin = html.match(/https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+/i)?.[0] ?? null;

  if (person) {
    const image = first(person.image);
    const photo = typeof image === "string" ? image : image?.url;
    const country = person.address?.addressCountry;
    const sameAs = ([] as string[]).concat(person.sameAs ?? []);
    return {
      name: clean(person.name, 80),
      role: clean(first(person.jobTitle), 80),
      organization: clean(first(person.worksFor)?.name, 80),
      city: clean(person.address?.addressLocality, 60),
      country: countryOf([person.address?.addressLocality, typeof country === "string" ? country : country?.name].filter(Boolean).join(", ")),
      photoUrl: photo ? new URL(photo, url).toString() : meta.image,
      bio: clean(person.description ?? meta.description, 2000),
      website: url.toString(),
      linkedin: sameAs.find((s) => /linkedin\.com\/in\//i.test(s)) ?? linkedin,
    };
  }

  // "Jane Doe — Designer produit" / "Jane Doe | Développeuse"
  const [name, role] = (meta.title ?? "").split(/\s+[|–—·-]\s+/);
  return {
    name: clean(name, 80),
    role: clean(role, 80),
    organization: null,
    city: null,
    country: null,
    photoUrl: meta.image,
    bio: clean(meta.description, 2000),
    website: url.toString(),
    linkedin,
  };
}

/** Reads a LinkedIn profile or a website and returns what it could find. */
export async function extractProfile(input: string): Promise<{ ok: true; draft: ProfileDraft } | { ok: false; error: string }> {
  const raw = input.trim();
  const page = await fetchPublic(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`, {
    maxBytes: MAX_BYTES,
    userAgent: /linkedin\.com/i.test(raw) ? PREVIEW_BOT : undefined,
  });
  if (!page.ok) return { ok: false, error: FAILURES[page.reason] };

  if (isLinkedInProfile(page.url)) {
    const meta = parseMetadata(page.body, page.url);
    if (!meta.title || /^LinkedIn$/i.test(meta.title)) {
      return { ok: false, error: "LinkedIn n'a pas montré ce profil (profil privé ou accès limité). Remplissez-le à la main." };
    }
    return { ok: true, draft: parseLinkedIn(meta.title, meta.description, meta.image, page.url) };
  }
  if (/(^|\.)linkedin\.com$/i.test(page.url.hostname)) {
    return { ok: false, error: "LinkedIn a redirigé vers une page de connexion : ce profil n'est pas public." };
  }
  const draft = parseWebsite(page.body, page.url);
  if (!draft.name) return { ok: false, error: "Aucun nom trouvé sur cette page." };
  return { ok: true, draft };
}
