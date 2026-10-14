import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const stored = { value: null as string | null };
vi.mock("@/lib/db", () => ({
  prisma: { setting: { findUnique: async () => (stored.value ? { value: stored.value } : null) } },
}));

const { isCronAuthorized } = await import("@/lib/cron-auth");
const headers = (h: Record<string, string>) => new Headers(h);

describe("isCronAuthorized", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
    stored.value = null;
  });

  it("refuses calls without a secret, even when none is configured", async () => {
    expect(await isCronAuthorized(headers({}))).toBe(false);
    expect(await isCronAuthorized(headers({ authorization: "Bearer " }))).toBe(false);
  });

  it("accepts Vercel Cron's Bearer CRON_SECRET", async () => {
    process.env.CRON_SECRET = "env-secret";
    expect(await isCronAuthorized(headers({ authorization: "Bearer env-secret" }))).toBe(true);
    expect(await isCronAuthorized(headers({ authorization: "Bearer wrong" }))).toBe(false);
  });

  it("accepts the GitHub schedule's secret by its stored fingerprint only", async () => {
    stored.value = createHash("sha256").update("github-secret").digest("hex");
    expect(await isCronAuthorized(headers({ authorization: "Bearer github-secret" }))).toBe(true);
    expect(await isCronAuthorized(headers({ "x-cron-secret": "github-secret" }))).toBe(true);
    expect(await isCronAuthorized(headers({ authorization: "Bearer github-secreT" }))).toBe(false);
  });
});
