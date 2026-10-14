import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { cleanGoogleNewsUrl, googleNewsSourceUrl, isGoogleNewsSource, parseGoogleNews } from "@/lib/importer/google-news";
import { decryptSecret, encryptSecret, looksLikeSerpApiKey } from "@/lib/serpapi";
import { subjectOf } from "@/app/godmod/integrations/subjects";

describe("Google News sources", () => {
  it("recognises SerpApi Google News addresses only", () => {
    expect(isGoogleNewsSource("https://serpapi.com/search?engine=google_news&q=congo")).toBe(true);
    expect(isGoogleNewsSource("https://serpapi.com/search?engine=google&q=congo")).toBe(false);
    expect(isGoogleNewsSource("https://example.com/search?engine=google_news")).toBe(false);
  });

  it("never stores an api_key or unknown parameters", () => {
    const url = cleanGoogleNewsUrl("https://serpapi.com/search?engine=google_news&q=startups+Congo&gl=cg&api_key=secret123&foo=bar");
    expect(url).not.toContain("secret123");
    expect(url).not.toContain("foo");
    expect(new URL(url).searchParams.get("q")).toBe("startups Congo");
  });

  it("reads back the subject typed by the admin", () => {
    expect(subjectOf(googleNewsSourceUrl({ q: "fintech Afrique centrale when:7d", gl: "cg", hl: "fr", so: "1" }))).toBe("fintech Afrique centrale");
  });

  it("parses results, flattening story clusters and skipping incomplete ones", () => {
    const articles = parseGoogleNews(
      {
        news_results: [
          {
            title: "Brazzaville accueille un hackathon",
            link: "https://adiac-congo.com/content/hackathon",
            thumbnail: "https://img.example/1.jpg",
            iso_date: "2026-10-12T08:00:00Z",
            source: { name: "ADIAC" },
          },
          {
            highlight: { title: "Une fintech lève 2 M$", link: "https://techcabal.com/fintech", date: "10/13/2026, 07:00 AM, +0000 UTC" },
            stories: [{ title: "Suite de l'histoire", link: "https://example.com/suite" }, { title: "Sans lien" }],
          },
          { title: "", link: "https://example.com/vide" },
          { title: "Lien invalide", link: "javascript:alert(1)" },
        ],
      },
      "fr"
    );
    expect(articles.map((a) => a.url)).toEqual(["https://adiac-congo.com/content/hackathon", "https://techcabal.com/fintech", "https://example.com/suite"]);
    expect(articles[0]).toMatchObject({ image: "https://img.example/1.jpg", keywords: ["ADIAC"], language: "fr", summary: null });
    expect(articles[0].publishedAt?.toISOString()).toBe("2026-10-12T08:00:00.000Z");
    expect(articles[1].publishedAt?.toISOString()).toBe("2026-10-13T07:00:00.000Z");
    expect(parseGoogleNews({ error: "Invalid API key" }, null)).toEqual([]);
  });
});

describe("SerpApi key storage", () => {
  const key = randomBytes(32);
  const apiKey = "a".repeat(32) + "0123456789abcdef0123456789abcdef";

  it("accepts only 64 hexadecimal characters", () => {
    expect(looksLikeSerpApiKey(apiKey)).toBe(true);
    expect(looksLikeSerpApiKey("abc")).toBe(false);
    expect(looksLikeSerpApiKey("z".repeat(64))).toBe(false);
  });

  it("encrypts so the key never appears in the stored value, and decrypts it back", () => {
    const sealed = encryptSecret(apiKey, key);
    expect(sealed).not.toContain(apiKey);
    expect(decryptSecret(sealed, key)).toBe(apiKey);
  });

  it("returns null for a tampered value or another server secret", () => {
    const sealed = encryptSecret(apiKey, key);
    expect(decryptSecret(sealed, randomBytes(32))).toBeNull();
    expect(decryptSecret(sealed.slice(0, -2) + "AA", key)).toBeNull();
    expect(decryptSecret("garbage", key)).toBeNull();
  });
});

describe("Google News search parameters", () => {
  it("drops `so` when there is a query (SerpApi refuses both together)", () => {
    expect(new URL(cleanGoogleNewsUrl("https://serpapi.com/search?engine=google_news&q=startups&so=1")).searchParams.has("so")).toBe(false);
    expect(new URL(googleNewsSourceUrl({ topic_token: "abc", so: "1" })).searchParams.get("so")).toBe("1");
  });
});

describe("describeGoogleNews", () => {
  it("shows the subject without the when: operator", async () => {
    const { describeGoogleNews } = await import("@/lib/importer/google-news");
    expect(describeGoogleNews("https://serpapi.com/search?engine=google_news&q=startups+when:7d&gl=cg&hl=fr&so=1")).toBe("« startups » · CG · fr");
  });
});
