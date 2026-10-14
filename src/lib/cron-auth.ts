import { createHash, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

/*
 * Who may call /api/cron/*: Vercel Cron (Authorization: Bearer $CRON_SECRET when
 * that variable is set) or the GitHub Actions schedule (.github/workflows/import.yml),
 * whose secret is stored here only as a SHA-256 fingerprint ("cron.secretHash").
 */

const HASH_ROW = "cron.secretHash";
const LAST_RUN_ROW = "import.lastAuto";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

function sameSecret(given: string, expected: string): boolean {
  const a = sha256(given);
  const b = sha256(expected);
  return timingSafeEqual(a, b);
}

/** The secret from `Authorization: Bearer …` or `x-cron-secret`. */
function presented(headers: Headers): string | null {
  const bearer = headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return (bearer ?? headers.get("x-cron-secret") ?? "").trim() || null;
}

export async function isCronAuthorized(headers: Headers): Promise<boolean> {
  const given = presented(headers);
  if (!given) return false;
  const env = process.env.CRON_SECRET;
  if (env && sameSecret(given, env)) return true;
  const row = await prisma.setting.findUnique({ where: { key: HASH_ROW } }).catch(() => null);
  if (typeof row?.value !== "string") return false;
  return timingSafeEqual(sha256(given), Buffer.from(row.value, "hex"));
}

/** Stores the fingerprint of the schedule's secret (the secret itself is never stored). */
export async function saveCronSecretHash(secret: string): Promise<void> {
  const value = sha256(secret).toString("hex");
  await prisma.setting.upsert({ where: { key: HASH_ROW }, create: { key: HASH_ROW, value }, update: { value } });
}

export interface AutoImportRun {
  at: string;
  trigger: string;
  ran: { name: string; message: string }[];
  ranked: number;
  error?: string;
}

export async function recordAutoImport(run: AutoImportRun): Promise<void> {
  const value = run as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({ where: { key: LAST_RUN_ROW }, create: { key: LAST_RUN_ROW, value }, update: { value } });
}

export async function lastAutoImport(): Promise<AutoImportRun | null> {
  const row = await prisma.setting.findUnique({ where: { key: LAST_RUN_ROW } }).catch(() => null);
  return (row?.value as AutoImportRun | null) ?? null;
}
