import { cache } from "react";
import { createHmac, timingSafeEqual } from "node:crypto";
import { avatarUrl } from "./gravatar";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const SESSION_COOKIE = "session";
/** Pre-signing cookie that held a bare user id; ignored and cleared on logout. */
const LEGACY_SESSION_COOKIE = "user_id";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export interface Session {
  userId: number;
  username: string;
  /** Gravatar URL for the header (the email itself is never exposed). */
  avatarUrl: string;
  karma: number;
  isAdmin: boolean;
  createdAt: Date;
}

/* ---------- Signed session token: base64url(payload).base64url(hmac) ---------- */

/**
 * SESSION_SECRET if set. Until it is, fall back to secrets every deployment
 * already has: the Supabase JWT secret, then the database URL (it embeds the DB
 * password, so anyone who could forge with it already has the database).
 * The key is derived with a fixed label so a secret is never used raw for two purposes.
 */
function sessionKey(): Buffer {
  const secret =
    process.env.SESSION_SECRET || process.env.SUPABASE_JWT_SECRET || process.env.POSTGRES_PRISMA_URL;
  if (!secret) throw new Error("SESSION_SECRET must be set");
  return createHmac("sha256", secret).update("techcg-session-v1").digest();
}

function sign(data: string, key: Buffer): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

export function signSessionToken(userId: number, key: Buffer, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Math.floor(now / 1000) + SESSION_MAX_AGE })
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

/** Returns the user id if the token is authentic and unexpired, else null. */
export function verifySessionToken(token: string, key: Buffer, now = Date.now()): number | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isInteger(uid) || typeof exp !== "number" || exp * 1000 <= now) return null;
    return uid;
  } catch {
    return null;
  }
}

export async function createSession(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signSessionToken(userId, sessionKey()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * Current user from the signed session cookie, or null.
 * Cached per request so the header and the page share one lookup.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const userId = verifySessionToken(token, sessionKey());
    if (userId === null) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        karma: true,
        isAdmin: true,
        banned: true,
        createdAt: true,
      },
    });

    // Suspended members are treated as logged out everywhere.
    if (!user || user.banned) return null;

    return {
      userId: user.id,
      username: user.username,
      avatarUrl: avatarUrl(user.email, user.username, 36),
      karma: user.karma,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
});

/** The current session if it belongs to an admin, else null. */
export async function getAdminSession(): Promise<Session | null> {
  const session = await getSession();
  return session?.isAdmin ? session : null;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(LEGACY_SESSION_COOKIE);
}
