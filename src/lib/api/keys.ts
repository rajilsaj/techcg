import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ApiError } from "./http";

/*
 * Who is calling the API: a member's personal key (Authorization: Bearer tcg_…),
 * or, for the site's own pages, the session cookie. Keys are created and revoked
 * in « Mon espace › API »; only their SHA-256 is stored.
 */

export const KEY_PREFIX = "tcg_";
export const MAX_KEYS_PER_MEMBER = 5;

export interface ApiCaller {
  userId: number;
  username: string;
  isAdmin: boolean;
  via: "key" | "session";
}

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** A new random key: shown once to the member, then only its hash is kept. */
export function generateKey(): { key: string; prefix: string; hash: string } {
  const key = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 6), hash: hashKey(key) };
}

/** The bearer token of the request, if any. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * The caller, or null when anonymous. A malformed or unknown key is an error
 * (never silently anonymous). The session cookie only counts for requests from
 * the site itself, so another site can't write in a visitor's name.
 */
export async function apiCaller(request: Request): Promise<ApiCaller | null> {
  const token = bearerToken(request);
  if (token) {
    if (!token.startsWith(KEY_PREFIX) || token.length > 100) throw new ApiError("unauthorized", "Clé API invalide.");
    const key = await prisma.apiKey.findUnique({
      where: { hash: hashKey(token) },
      select: { id: true, lastUsedAt: true, user: { select: { id: true, username: true, isAdmin: true, banned: true } } },
    });
    if (!key || key.user.banned) throw new ApiError("unauthorized", "Clé API invalide ou révoquée.");
    // Last use, at most once a minute.
    if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000) {
      await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    }
    return { userId: key.user.id, username: key.user.username, isAdmin: key.user.isAdmin, via: "key" };
  }

  if (UNSAFE.has(request.method)) {
    const site = request.headers.get("sec-fetch-site");
    const origin = request.headers.get("origin");
    const sameSite = site ? site === "same-origin" : !origin || origin === new URL(request.url).origin;
    if (!sameSite) return null;
  }
  const session = await getSession();
  return session ? { userId: session.userId, username: session.username, isAdmin: session.isAdmin, via: "session" } : null;
}

/** The caller, or a 401. */
export async function requireCaller(request: Request): Promise<ApiCaller> {
  const caller = await apiCaller(request);
  if (!caller) throw new ApiError("unauthorized");
  return caller;
}
