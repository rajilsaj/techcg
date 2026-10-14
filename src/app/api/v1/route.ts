import { endpoint, json, preflight, siteOrigin } from "@/lib/api/http";
import { ENDPOINTS } from "@/lib/api/spec";

/** GET /api/v1: what the API offers, with links to the documentation. */
export const GET = endpoint(async (request) => {
  const origin = siteOrigin(request);
  return json({
    data: {
      name: "API Tech.cg",
      version: "v1",
      documentation: `${origin}/api`,
      openapi: `${origin}/api/v1/openapi.json`,
      authentication: "Authorization: Bearer <clé tcg_…> (Mon espace › API). Les lectures publiques n'en ont pas besoin.",
      endpoints: ENDPOINTS.map((e) => ({ method: e.method, path: `/api/v1${e.path}`, summary: e.summary, auth: e.auth })),
    },
  });
});

export const OPTIONS = preflight;
