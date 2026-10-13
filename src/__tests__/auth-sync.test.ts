import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecodedIdToken } from "firebase-admin/auth";

// --- Mocks: Firebase Admin, the database and the session cookie -------------------
const verifyIdToken = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  FirebaseAdminNotConfiguredError: class FirebaseAdminNotConfiguredError extends Error {},
  getFirebaseAdminAuth: () => ({ verifyIdToken }),
}));

type Row = { id: number; username: string; firebaseUid: string | null; email: string | null; phone: string | null; banned: boolean };
const users: Row[] = [];
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: Partial<Row> }) =>
        users.find((u) => (where.firebaseUid ? u.firebaseUid === where.firebaseUid : u.username === where.username)) ?? null
      ),
      create: vi.fn(async ({ data }: { data: Omit<Row, "id" | "banned"> }) => {
        const row = { id: users.length + 1, banned: false, ...data } as Row;
        users.push(row);
        return { id: row.id, username: row.username };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: number }; data: Partial<Row> }) => Object.assign(users.find((u) => u.id === where.id)!, data)),
    },
  },
}));

const createSession = vi.fn();
vi.mock("@/lib/auth", () => ({ createSession: (id: number) => createSession(id), clearSession: vi.fn() }));

import { POST } from "@/app/api/v1/auth/session/route";
import { identityFromToken } from "@/lib/auth-sync/firebase";
import { baseUsername, usernameCandidate } from "@/lib/auth-sync/identity";

const token = (overrides: Partial<DecodedIdToken> & { provider?: string } = {}): DecodedIdToken =>
  ({
    uid: "uid-abc123",
    firebase: { sign_in_provider: overrides.provider ?? "google.com", identities: {} },
    email: "Jean.Mabiala@gmail.com",
    email_verified: true,
    name: "Jean Mabiala",
    ...overrides,
  }) as unknown as DecodedIdToken;

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/v1/auth/session", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }) as never);

beforeEach(() => {
  users.length = 0;
  verifyIdToken.mockReset();
  createSession.mockReset();
});

describe("identityFromToken", () => {
  it("accepts Google, SMS and email-link sign-ins", () => {
    expect(identityFromToken(token()).provider).toBe("google");
    expect(identityFromToken(token({ provider: "phone", phone_number: "+242061234567", email: undefined })).phone).toBe("+242061234567");
    expect(identityFromToken(token({ provider: "password" })).provider).toBe("email_link");
  });

  it("rejects other providers and ignores unverified emails", () => {
    expect(() => identityFromToken(token({ provider: "anonymous" }))).toThrow("unsupported_provider");
    expect(identityFromToken(token({ provider: "password", email_verified: false })).email).toBeNull();
    expect(identityFromToken(token()).email).toBe("jean.mabiala@gmail.com");
  });
});

describe("usernames", () => {
  it("derives a clean, bounded base and numbered fallbacks", () => {
    expect(baseUsername({ firebaseUid: "x", displayName: "Grâce Ngoma", email: null })).toBe("grace_ngoma");
    expect(baseUsername({ firebaseUid: "AbCdEf99", displayName: "Al", email: null })).toBe("user_abcdef");
    expect(usernameCandidate("abcdefghijklmnopqrst", 12)).toBe("abcdefghijklmnopqr12");
  });
});

describe("POST /api/v1/auth/session", () => {
  it("creates the account on first sign-in, then returns the same one (idempotent)", async () => {
    verifyIdToken.mockResolvedValue(token());
    const first = await post({ idToken: "t" });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ username: "jean_mabiala", isNew: true });

    const again = await post({ idToken: "t" });
    expect(await again.json()).toEqual({ username: "jean_mabiala", isNew: false });
    expect(users).toHaveLength(1);
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(verifyIdToken).toHaveBeenCalledWith("t", true); // revocation checked
  });

  it("fills a missing phone but never overwrites existing values", async () => {
    users.push({ id: 1, username: "jean", firebaseUid: "uid-abc123", email: "old@x.cg", phone: null, banned: false });
    verifyIdToken.mockResolvedValue(token({ provider: "phone", phone_number: "+242060000000", email: "new@x.cg" }));
    await post({ idToken: "t" });
    expect(users[0]).toMatchObject({ email: "old@x.cg", phone: "+242060000000" });
  });

  it("picks a free username when the preferred one is taken", async () => {
    users.push({ id: 1, username: "jean_mabiala", firebaseUid: "someone-else", email: null, phone: null, banned: false });
    verifyIdToken.mockResolvedValue(token());
    expect((await (await post({ idToken: "t" })).json()).username).toBe("jean_mabiala2");
  });

  it.each([
    ["missing token", {}, 400, "invalid_request"],
    ["malformed JSON", "{oops", 400, "invalid_request"],
  ])("rejects a %s", async (_label, body, status, code) => {
    const res = await post(body);
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it.each([
    ["expired or forged token", { code: "auth/id-token-expired" }, 401, "invalid_token"],
    ["revoked token", { code: "auth/id-token-revoked" }, 401, "token_revoked"],
    ["disabled Firebase user", { code: "auth/user-disabled" }, 403, "account_suspended"],
    ["broken Admin SDK credentials", { code: "app/invalid-credential" }, 503, "auth_unavailable"],
  ])("maps a %s to a clean JSON error", async (_label, failure, status, code) => {
    verifyIdToken.mockRejectedValue(Object.assign(new Error("internal detail"), failure));
    const res = await post({ idToken: "t" });
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.error.code).toBe(code);
    expect(JSON.stringify(body)).not.toContain("internal detail");
    expect(createSession).not.toHaveBeenCalled();
  });

  it("refuses suspended accounts", async () => {
    users.push({ id: 1, username: "jean", firebaseUid: "uid-abc123", email: null, phone: null, banned: true });
    verifyIdToken.mockResolvedValue(token());
    const res = await post({ idToken: "t" });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("account_suspended");
    expect(createSession).not.toHaveBeenCalled();
  });

  it("hides database errors behind internal_error", async () => {
    verifyIdToken.mockResolvedValue(token());
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.user.create).mockRejectedValueOnce(new Error('relation "User" violates constraint xyz'));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ idToken: "t" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("violates");
  });
});
