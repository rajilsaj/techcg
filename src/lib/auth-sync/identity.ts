import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { AuthSyncError } from "./errors";
import type { VerifiedIdentity } from "./firebase";

const USERNAME_MAX = 20;
const CREATE_ATTEMPTS = 5;

export interface SyncedUser {
  userId: number;
  username: string;
  isNew: boolean;
}

function slug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]+/g, "")
    .slice(0, USERNAME_MAX);
}

/** Preferred username: display name, else the email's local part, else derived from the UID. */
export function baseUsername(identity: { firebaseUid: string; displayName: string | null; email: string | null }): string {
  const fromName = identity.displayName ? slug(identity.displayName) : "";
  const fromEmail = identity.email ? slug(identity.email.split("@")[0]) : "";
  const candidate = fromName.length >= 3 ? fromName : fromEmail.length >= 3 ? fromEmail : "";
  return candidate || `user_${identity.firebaseUid.slice(0, 6).toLowerCase()}`;
}

/** base, base2, base3… trimmed so the suffix still fits in the username limit. */
export function usernameCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base;
  const suffix = String(attempt);
  return `${base.slice(0, USERNAME_MAX - suffix.length)}${suffix}`;
}

async function firstFreeUsername(base: string, from: number): Promise<{ username: string; attempt: number }> {
  for (let attempt = from; ; attempt++) {
    const username = usernameCandidate(base, attempt);
    if (!(await prisma.user.findUnique({ where: { username }, select: { id: true } }))) return { username, attempt };
  }
}

function uniqueViolationOn(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  const target = (error.meta?.target ?? []) as string[] | string;
  return Array.isArray(target) ? target.includes(field) : String(target).includes(field);
}

/**
 * Idempotent upsert of a verified identity into the users table, keyed by the
 * unique Firebase UID. Repeating it changes nothing, except filling in the email
 * if the account didn't have one yet (an existing email is never overwritten).
 * Concurrent first sign-ins of the same person resolve to a single account.
 */
export async function syncIdentity(identity: VerifiedIdentity): Promise<SyncedUser> {
  const existing = await prisma.user.findUnique({
    where: { firebaseUid: identity.firebaseUid },
    select: { id: true, username: true, email: true, banned: true },
  });

  if (existing) {
    if (existing.banned) throw new AuthSyncError("account_suspended");
    if (!existing.email) await prisma.user.update({ where: { id: existing.id }, data: { email: identity.email } });
    return { userId: existing.id, username: existing.username, isNew: false };
  }

  const base = baseUsername(identity);
  let attempt = 1;
  for (let tries = 0; tries < CREATE_ATTEMPTS; tries++) {
    const free = await firstFreeUsername(base, attempt);
    try {
      const user = await prisma.user.create({
        data: { username: free.username, firebaseUid: identity.firebaseUid, email: identity.email },
        select: { id: true, username: true },
      });
      return { userId: user.id, username: user.username, isNew: true };
    } catch (error) {
      // Same person signing in twice at once: the other request created the account.
      if (uniqueViolationOn(error, "firebaseUid")) return syncIdentity(identity);
      // Someone else took this username in the meantime: try the next one.
      if (uniqueViolationOn(error, "username")) {
        attempt = free.attempt + 1;
        continue;
      }
      throw new AuthSyncError("internal_error", error);
    }
  }
  throw new AuthSyncError("internal_error", new Error(`No free username for base "${base}"`));
}
