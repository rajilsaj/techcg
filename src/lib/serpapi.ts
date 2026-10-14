import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

/*
 * SerpApi key entered in Admin › Intégrations. Stored in the Setting table,
 * encrypted with AES-256-GCM under a key derived from the server secret, and
 * never sent back to the browser (only its last 4 characters). The
 * SERPAPI_API_KEY environment variable is used when no key was entered.
 */

const KEY_ROW = "serpapi.key";
const STATUS_ROW = "serpapi.status";
const ACCOUNT_URL = "https://serpapi.com/account.json";

export interface SerpApiStatus {
  ok: boolean;
  checkedAt: string;
  /** Short French message for the admin. */
  message: string;
  plan?: string | null;
  searchesLeft?: number | null;
  searchesPerMonth?: number | null;
  thisMonthUsage?: number | null;
}

function cipherKey(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_JWT_SECRET || process.env.POSTGRES_PRISMA_URL;
  if (!secret) throw new Error("SESSION_SECRET must be set");
  return createHmac("sha256", secret).update("techcg-serpapi-key-v1").digest();
}

export function encryptSecret(plain: string, key = cipherKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(sealed: string, key = cipherKey()): string | null {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null; // server secret changed, or the value was tampered with
  }
}

/** A SerpApi private key is 64 hexadecimal characters. */
export const looksLikeSerpApiKey = (value: string) => /^[a-f0-9]{64}$/i.test(value);

async function storedKey(): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: KEY_ROW } });
  return typeof row?.value === "string" ? decryptSecret(row.value) : null;
}

/** The key to use for searches: the one entered in the admin, else the environment variable. */
export async function getSerpApiKey(): Promise<string | null> {
  return (await storedKey().catch(() => null)) ?? process.env.SERPAPI_API_KEY ?? null;
}

/** What the admin page may show: where the key comes from, its last 4 characters, the last check. */
export async function serpApiOverview(): Promise<{ source: "admin" | "env" | null; hint: string | null; status: SerpApiStatus | null }> {
  const [admin, statusRow] = await Promise.all([storedKey(), prisma.setting.findUnique({ where: { key: STATUS_ROW } })]);
  const key = admin ?? process.env.SERPAPI_API_KEY ?? null;
  return {
    source: admin ? "admin" : key ? "env" : null,
    hint: key ? `••••${key.slice(-4)}` : null,
    status: (statusRow?.value as SerpApiStatus | null) ?? null,
  };
}

export async function saveSerpApiKey(key: string | null): Promise<void> {
  if (key === null) {
    await prisma.setting.deleteMany({ where: { key: { in: [KEY_ROW, STATUS_ROW] } } });
    return;
  }
  const value = encryptSecret(key);
  await prisma.setting.upsert({ where: { key: KEY_ROW }, create: { key: KEY_ROW, value }, update: { value } });
}

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** Asks SerpApi's Account API about the key (free: it uses no search credits). */
export async function checkSerpApiKey(key: string): Promise<SerpApiStatus> {
  const checkedAt = new Date().toISOString();
  let response: Response;
  try {
    response = await fetch(`${ACCOUNT_URL}?api_key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  } catch {
    return { ok: false, checkedAt, message: "SerpApi ne répond pas. Réessayez dans un instant." };
  }
  let body: Record<string, unknown> = {};
  try {
    body = await response.json();
  } catch {
    // handled below
  }
  if (!response.ok || body.error) {
    const invalid = response.status === 401 || /invalid api key/i.test(String(body.error ?? ""));
    return {
      ok: false,
      checkedAt,
      message: invalid ? "Clé refusée par SerpApi : vérifiez-la sur serpapi.com/manage-api-key." : `SerpApi a répondu une erreur (${response.status}).`,
    };
  }

  const searchesLeft = num(body.total_searches_left) ?? num(body.plan_searches_left);
  const active = body.account_status === undefined || body.account_status === "Active";
  return {
    ok: active && (searchesLeft === null || searchesLeft > 0),
    checkedAt,
    message: !active
      ? `Compte SerpApi ${String(body.account_status).toLowerCase()}.`
      : searchesLeft === 0
        ? "Clé valide, mais plus aucune recherche disponible ce mois-ci."
        : "Clé valide : Google News est prêt.",
    plan: typeof body.plan_name === "string" ? body.plan_name : null,
    searchesLeft,
    searchesPerMonth: num(body.searches_per_month),
    thisMonthUsage: num(body.this_month_usage),
  };
}

export async function saveSerpApiStatus(status: SerpApiStatus): Promise<void> {
  const value = status as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({ where: { key: STATUS_ROW }, create: { key: STATUS_ROW, value }, update: { value } });
}
