import { prisma } from "@/lib/db";
import { PROFILE_COUNTRIES, isProfileCountry } from "@/lib/profiles";
import { ApiError, endpoint, ok, preflight, siteOrigin } from "@/lib/api/http";

/** GET /api/v1/profiles/{slug}: one Profiles.CG profile. */
export const GET = endpoint<{ slug: string }>(async (request, { params }) => {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) throw new ApiError("not_found", "Profil introuvable.");
  const profile = await prisma.profile.findFirst({
    where: { slug, published: true },
    select: {
      slug: true,
      name: true,
      role: true,
      organization: true,
      city: true,
      country: true,
      photoUrl: true,
      bio: true,
      website: true,
      linkedin: true,
      twitter: true,
      updatedAt: true,
    },
  });
  if (!profile) throw new ApiError("not_found", "Profil introuvable.");
  return ok({
    ...profile,
    country: isProfileCountry(profile.country) ? PROFILE_COUNTRIES[profile.country] : profile.country,
    updatedAt: profile.updatedAt.toISOString(),
    links: { web: `${siteOrigin(request)}/profils/${profile.slug}` },
  });
});

export const OPTIONS = preflight;
