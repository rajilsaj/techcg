import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { SESSION_MAX_AGE, signSessionToken, verifySessionToken } from "@/lib/auth";

const key = createHmac("sha256", "test-secret").update("techcg-session-v1").digest();
const otherKey = createHmac("sha256", "other-secret").update("techcg-session-v1").digest();

describe("session tokens", () => {
  it("round-trips a user id", () => {
    expect(verifySessionToken(signSessionToken(42, key), key)).toBe(42);
  });

  it("rejects a bare user id (the old cookie format)", () => {
    expect(verifySessionToken("1", key)).toBeNull();
  });

  it("rejects a token signed with another key", () => {
    expect(verifySessionToken(signSessionToken(1, otherKey), key)).toBeNull();
  });

  it("rejects a token whose user id was edited", () => {
    const [, signature] = signSessionToken(42, key).split(".");
    const forged = Buffer.from(JSON.stringify({ uid: 1, exp: 9999999999 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, key)).toBeNull();
  });

  it("rejects an expired token", () => {
    const issued = Date.now() - (SESSION_MAX_AGE + 60) * 1000;
    expect(verifySessionToken(signSessionToken(42, key, issued), key)).toBeNull();
  });
});
