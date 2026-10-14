import { NextResponse, type NextRequest } from "next/server";
import type { Refusal, RefusalCode } from "@/lib/publish";

/*
 * Plumbing shared by every /api/v1 endpoint: one JSON shape for success
 * ({ data, meta? }) and for errors ({ error: { code, message, details? } }),
 * CORS for use from any site, a per-IP rate limit, and no internal error ever
 * sent to the caller.
 */

export const API_VERSION = "v1";

export type ErrorCode =
  | "bad_request"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "method_not_allowed"
  | "rate_limited"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  validation: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  rate_limited: 429,
  internal: 500,
};

const MESSAGES: Record<ErrorCode, string> = {
  bad_request: "Requête invalide.",
  validation: "Données invalides.",
  unauthorized: "Authentification requise : clé API (Authorization: Bearer …) ou session.",
  forbidden: "Action non autorisée.",
  not_found: "Ressource introuvable.",
  method_not_allowed: "Méthode non autorisée.",
  rate_limited: "Trop de requêtes. Réessayez plus tard.",
  internal: "Erreur interne. Réessayez plus tard.",
};

/** Thrown inside a handler to answer with a clean error. */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: Record<string, unknown>,
    public retryAfter?: number
  ) {
    super(message ?? MESSAGES[code]);
  }
}

/** A shared publish/comment refusal as an API error. */
export function fromRefusal(refusal: Refusal): ApiError {
  const codes: Record<RefusalCode, ErrorCode> = {
    unauthorized: "unauthorized",
    forbidden: "forbidden",
    validation: "validation",
    not_found: "not_found",
    rate_limited: "rate_limited",
  };
  return new ApiError(codes[refusal.code], refusal.message, undefined, refusal.retryAfter);
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...headers } });
}

/** Success: `{ data, meta? }`. */
export const ok = (data: unknown, meta?: Record<string, unknown>, status = 200) => json(meta ? { data, meta } : { data }, status);

export function errorResponse(error: ApiError): NextResponse {
  const body = { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } };
  return json(body, STATUS[error.code], error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {});
}

/** Answer to CORS preflight requests. */
export const preflight = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });

// Per-IP limit (per server instance): plenty for apps, stops runaway scripts.
const READS_PER_MINUTE = 120;
const hits = new Map<string, { count: number; reset: number }>();
function overLimit(ip: string): number | null {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    if (hits.size > 20_000) hits.clear();
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return null;
  }
  return ++entry.count > READS_PER_MINUTE ? Math.ceil((entry.reset - now) / 1000) : null;
}

const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";

type Handler<P> = (request: NextRequest, context: { params: Promise<P> }) => Promise<NextResponse>;

/** Wraps an endpoint: rate limit, then the handler; any unexpected error becomes a plain 500. */
export function endpoint<P = Record<string, never>>(handler: Handler<P>): Handler<P> {
  return async (request, context) => {
    try {
      const wait = overLimit(clientIp(request));
      if (wait !== null) throw new ApiError("rate_limited", undefined, undefined, wait);
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      console.error("API error:", error);
      return errorResponse(new ApiError("internal"));
    }
  };
}

/** The JSON body as an object, or a 400. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError("bad_request", "Corps JSON (objet) attendu.");
  return body as Record<string, unknown>;
}

/** A positive integer path segment (an id), else 404. */
export function idParam(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) throw new ApiError("not_found");
  return id;
}

/** `?limit=` within [1, max]. */
export function limitParam(params: URLSearchParams, fallback = 30, max = 100): number {
  const raw = params.get("limit");
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new ApiError("validation", `limit doit être un entier entre 1 et ${max}.`);
  return Math.min(n, max);
}

/** `?before=<id>` cursor for lists ordered by id (newest first). */
export function beforeParam(params: URLSearchParams): number | undefined {
  const raw = params.get("before");
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError("validation", "before doit être un identifiant.");
  return n;
}

/** A string field of a JSON body. */
export function stringField(body: Record<string, unknown>, name: string, { required = false, max = 10000 } = {}): string | undefined {
  const value = body[name];
  if (value === undefined || value === null || value === "") {
    if (required) throw new ApiError("validation", `Champ « ${name} » requis.`, { field: name });
    return undefined;
  }
  if (typeof value !== "string") throw new ApiError("validation", `Champ « ${name} » : texte attendu.`, { field: name });
  if (value.length > max) throw new ApiError("validation", `Champ « ${name} » trop long (${max} caractères au plus).`, { field: name });
  return value;
}

/** The site's public address, for links in responses. */
export function siteOrigin(request: Request): string {
  return new URL(request.url).origin;
}
