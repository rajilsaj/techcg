import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { prisma } from "./db";

export const SESSION_COOKIE = "user_id";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface Session {
  userId: number;
  username: string;
  karma: number;
  createdAt: Date;
}

export async function createSession(userId: number): Promise<void> {
  const cookieStore = await cookies();

  // Store userId in cookie (in production, use JWT or a session store)
  cookieStore.set(SESSION_COOKIE, String(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * Get current session from cookie.
 * In v1, userId is stored directly in cookie. For v2+, use a proper session store.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const userIdStr = cookieStore.get(SESSION_COOKIE)?.value;

  if (!userIdStr) return null;

  try {
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        karma: true,
        createdAt: true,
      },
    });

    if (!user) return null;

    return {
      userId: user.id,
      username: user.username,
      karma: user.karma,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
