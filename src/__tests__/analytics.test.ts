import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseUserAgent } from "@/lib/analytics/user-agent";
import { cleanReferrer, clientIp, requestInfo } from "@/lib/analytics/request-info";
import { countryName, flag, formatDuration, placeLabel } from "@/lib/analytics/format";

const created: Record<string, unknown>[] = [];
const updateMany = vi.fn(async () => ({ count: 1 }));
vi.mock("@/lib/db", () => ({
  prisma: {
    pageView: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: created.length };
      }),
      updateMany: (...args: unknown[]) => updateMany(...(args as [])),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth", () => ({ getSession: async () => null }));
vi.mock("@/lib/settings", () => ({ getSettings: async () => ({ analyticsRetentionDays: 90 }) }));

import { POST } from "@/app/api/track/route";
import { NextRequest } from "next/server";

const UA = {
  chromeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  samsungAndroid: "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
  edgeMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

describe("parseUserAgent", () => {
  it.each([
    [UA.chromeWin, { browser: "Chrome", browserVer: "141.0", os: "Windows", osVer: "10/11", device: "desktop" }],
    [UA.safariIphone, { browser: "Safari", browserVer: "18.5", os: "iOS", osVer: "18.5", device: "mobile" }],
    [UA.samsungAndroid, { browser: "Samsung Internet", os: "Android", osVer: "14", device: "mobile" }],
    [UA.edgeMac, { browser: "Edge", os: "macOS", osVer: "10.15", device: "desktop" }],
    [UA.firefoxLinux, { browser: "Firefox", browserVer: "140.0", os: "Linux", device: "desktop" }],
    [UA.ipad, { os: "iOS", device: "tablet" }],
    [UA.googlebot, { device: "bot", isBot: true }],
  ])("parses %s", (ua, expected) => {
    expect(parseUserAgent(ua)).toMatchObject(expected);
  });
});

describe("request info", () => {
  it("reads the client IP and Vercel geolocation headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "41.202.207.5, 10.0.0.1",
      "x-vercel-ip-country": "CG",
      "x-vercel-ip-country-region": "12",
      "x-vercel-ip-city": "Pointe-Noire",
      "x-vercel-ip-postal-code": "",
      "x-vercel-ip-latitude": "-4.7761",
      "x-vercel-ip-longitude": "11.8635",
      "x-vercel-ip-timezone": "Africa/Brazzaville",
    });
    expect(requestInfo(headers)).toEqual({
      ip: "41.202.207.5",
      country: "CG",
      region: "12",
      city: "Pointe-Noire",
      postalCode: null,
      latitude: -4.7761,
      longitude: 11.8635,
      timezone: "Africa/Brazzaville",
    });
  });

  it("prefers x-real-ip, decodes city names and rejects bad coordinates", () => {
    const headers = new Headers({ "x-real-ip": "2c0f:f5c0::1", "x-forwarded-for": "1.1.1.1", "x-vercel-ip-city": "S%C3%A3o%20Tom%C3%A9", "x-vercel-ip-latitude": "999" });
    expect(clientIp(headers)).toBe("2c0f:f5c0::1");
    expect(requestInfo(headers)).toMatchObject({ city: "São Tomé", latitude: null });
  });

  it("keeps only external referrers, without query strings", () => {
    expect(cleanReferrer("https://www.google.com/search?q=techcg", "techcg.vercel.app")).toBe("https://www.google.com/search");
    expect(cleanReferrer("https://techcg.vercel.app/recents", "techcg.vercel.app")).toBeNull();
    expect(cleanReferrer("javascript:alert(1)", null)).toBeNull();
  });
});

describe("format", () => {
  it("formats countries, durations and places in French", () => {
    expect(flag("CG")).toBe("🇨🇬");
    expect(countryName("FR")).toBe("France");
    expect(countryName(null)).toBe("Inconnu");
    expect(formatDuration(83_000)).toBe("1 min 23 s");
    expect(formatDuration(4_000)).toBe("4 s");
    expect(formatDuration(null)).toBe("—");
    expect(placeLabel("Brazzaville", "BZV", null)).toBe("Brazzaville, BZV");
  });
});

describe("POST /api/track", () => {
  const request = (body: unknown, headers: Record<string, string> = {}) =>
    new NextRequest("https://techcg.vercel.app/api/track", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", "user-agent": UA.safariIphone, "x-real-ip": "41.202.207.9", "x-vercel-ip-country": "CG", "x-vercel-ip-city": "Brazzaville", host: "techcg.vercel.app", ...headers },
    });

  beforeEach(() => {
    created.length = 0;
    updateMany.mockClear();
  });

  it("records a page view with location and device, and sets the visitor cookie", async () => {
    const res = await POST(request({ type: "view", path: "/recents?x=1", referrer: "https://www.facebook.com/", screen: "390x844", language: "fr-FR", tz: "Africa/Brazzaville", sessionId: "s-123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1 });
    expect(created[0]).toMatchObject({
      path: "/recents",
      referrer: "https://www.facebook.com/",
      ip: "41.202.207.9",
      country: "CG",
      city: "Brazzaville",
      browser: "Safari",
      os: "iOS",
      device: "mobile",
      screen: "390x844",
      language: "fr-FR",
      clientTz: "Africa/Brazzaville",
      sessionId: "s-123",
      isBot: false,
    });
    expect(res.cookies.get("vid")?.value).toBe(created[0].visitorId);
  });

  it("ignores admin and API paths", async () => {
    expect((await POST(request({ type: "view", path: "/godmod/articles" }))).status).toBe(400);
    expect((await POST(request({ type: "view", path: "/api/medias" }))).status).toBe(400);
    expect(created).toHaveLength(0);
  });

  it("only lets the same visitor record the time spent on their view", async () => {
    await POST(request({ type: "leave", id: 5, durationMs: 42_000 }));
    expect(updateMany).not.toHaveBeenCalled(); // no visitor cookie

    await POST(request({ type: "leave", id: 5, durationMs: 42_000 }, { cookie: "vid=abcdefghijkl" }));
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 5, visitorId: "abcdefghijkl" }), data: { durationMs: 42_000 } }));
  });
});
