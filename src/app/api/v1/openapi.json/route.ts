import { endpoint, json, preflight, siteOrigin } from "@/lib/api/http";
import { openApi } from "@/lib/api/spec";

/** GET /api/v1/openapi.json: the API described in OpenAPI 3.1 (import into Postman, Insomnia…). */
export const GET = endpoint(async (request) => json(openApi(siteOrigin(request))));

export const OPTIONS = preflight;
