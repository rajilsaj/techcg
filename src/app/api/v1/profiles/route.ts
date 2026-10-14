import { prisma } from "@/lib/db";
import { initialOf, parseProfileFilters, profilesWhere, PROFILE_COUNTRIES, isProfileCountry } from "@/lib/profiles";
import { endpoint, json, preflight, siteOrigin } from "@/lib/api/http";

/** GET /api/v1/profiles?q=&letter=: Profiles.CG, the Congolese tech talents, A to Z. */
export const GET = endpoint(async (request) => {
  const params = new URL(request.url).searchParams;
  const { letter, q } = parseProfileFilters({ q: params.get("q") ?? "", lettre: params.get("letter") ?? "" });
  const origin = siteOrigin(request);
  const rows = await prisma.profile.findMany({
    where: profilesWhere(q),
    orderBy: { name: "asc" },
    select: { slug: true, name: true, role: true, organization: true, city: true, country: true, photoUrl: true },
  });
  return json({
    data: rows
      .filter((p) => !letter || initialOf(p.name) === letter)
      .map((p) => ({
        ...p,
        country: isProfileCountry(p.country) ? PROFILE_COUNTRIES[p.country] : p.country,
        links: { web: `${origin}/profils/${p.slug}`, api: `${origin}/api/v1/profiles/${p.slug}` },
      })),
  });
});

export const OPTIONS = preflight;
