import { describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

const keys = new Map<string, { id: number; lastUsedAt: Date | null; user: { id: number; username: string; isAdmin: boolean; banned: boolean } }>();
const session = { value: null as null | { userId: number; username: string; isAdmin: boolean } };
vi.mock("@/lib/db", () => ({
  prisma: {
    apiKey: {
      findUnique: async ({ where }: { where: { hash: string } }) => keys.get(where.hash) ?? null,
      update: async () => ({}),
    },
  },
}));
vi.mock("@/lib/auth", () => ({ getSession: async () => session.value }));

const { apiCaller, bearerToken, generateKey, hashKey } = await import("@/lib/api/keys");
const { ApiError, endpoint, limitParam } = await import("@/lib/api/http");
const { ENDPOINTS, openApi } = await import("@/lib/api/spec");

const request = (method: string, h: Record<string, string> = {}) => new Request("https://techcg.test/api/v1/stories", { method, headers: h });

describe("API keys", () => {
  it("generates distinct keys and stores only their hash", () => {
    const a = generateKey();
    const b = generateKey();
    expect(a.key).toMatch(/^tcg_[\w-]{40,}$/);
    expect(a.key).not.toBe(b.key);
    expect(a.hash).toBe(hashKey(a.key));
    expect(a.hash).not.toContain(a.key);
    expect(a.key.startsWith(a.prefix)).toBe(true);
  });

  it("reads the bearer token", () => {
    expect(bearerToken(request("GET", { authorization: "Bearer tcg_abc" }))).toBe("tcg_abc");
    expect(bearerToken(request("GET", { authorization: "Basic xyz" }))).toBeNull();
    expect(bearerToken(request("GET"))).toBeNull();
  });

  it("identifies the member of a valid key", async () => {
    const { key, hash } = generateKey();
    keys.set(hash, { id: 1, lastUsedAt: new Date(), user: { id: 7, username: "ada", isAdmin: false, banned: false } });
    expect(await apiCaller(request("POST", { authorization: `Bearer ${key}` }))).toEqual({ userId: 7, username: "ada", isAdmin: false, via: "key" });
  });

  it("refuses unknown, malformed and banned members' keys instead of going anonymous", async () => {
    await expect(apiCaller(request("GET", { authorization: "Bearer tcg_unknown" }))).rejects.toBeInstanceOf(ApiError);
    await expect(apiCaller(request("GET", { authorization: "Bearer sk_other" }))).rejects.toBeInstanceOf(ApiError);
    const { key, hash } = generateKey();
    keys.set(hash, { id: 2, lastUsedAt: null, user: { id: 8, username: "bob", isAdmin: false, banned: true } });
    await expect(apiCaller(request("GET", { authorization: `Bearer ${key}` }))).rejects.toBeInstanceOf(ApiError);
  });

  it("uses the session cookie for writes only from the site itself", async () => {
    session.value = { userId: 3, username: "me", isAdmin: false };
    expect(await apiCaller(request("POST", { "sec-fetch-site": "same-origin" }))).toMatchObject({ userId: 3, via: "session" });
    expect(await apiCaller(request("POST", { "sec-fetch-site": "cross-site" }))).toBeNull();
    expect(await apiCaller(request("POST", { origin: "https://evil.example" }))).toBeNull();
    // Reads can use the session from anywhere (no side effects).
    expect(await apiCaller(request("GET", { "sec-fetch-site": "cross-site" }))).toMatchObject({ userId: 3 });
    session.value = null;
  });
});

describe("API responses", () => {
  it("turns thrown errors into the JSON error shape, never leaking internals", async () => {
    const handler = endpoint(async () => {
      throw new Error("connection string postgres://secret");
    });
    const response = await handler(request("GET") as never, { params: Promise.resolve({}) });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("internal");
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("answers ApiError with its status and code", async () => {
    const handler = endpoint(async () => {
      throw new ApiError("not_found", "Publication introuvable.");
    });
    const response = await handler(request("GET") as never, { params: Promise.resolve({}) });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found", message: "Publication introuvable." } });
  });

  it("validates limit", () => {
    expect(limitParam(new URLSearchParams())).toBe(30);
    expect(limitParam(new URLSearchParams("limit=500"))).toBe(100);
    expect(() => limitParam(new URLSearchParams("limit=abc"))).toThrow(ApiError);
    expect(() => limitParam(new URLSearchParams("limit=0"))).toThrow(ApiError);
  });
});

describe("API description", () => {
  it("documents only endpoints that exist, with the right method exported", async () => {
    for (const e of ENDPOINTS) {
      const dir = path.join(process.cwd(), "src/app/api/v1", e.path.replace(/\{(\w+)\}/g, "[$1]"));
      const file = path.join(dir, "route.ts");
      expect(existsSync(file), `${e.method} ${e.path}`).toBe(true);
      const { readFileSync } = await import("node:fs");
      expect(readFileSync(file, "utf8"), `${e.method} ${e.path}`).toContain(`export const ${e.method} =`);
    }
  });

  it("builds a valid-looking OpenAPI file", () => {
    const spec = openApi("https://techcg.test");
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.servers[0].url).toBe("https://techcg.test/api/v1");
    expect(Object.keys(spec.paths)).toContain("/stories/{id}/comments");
    const ids = ENDPOINTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
