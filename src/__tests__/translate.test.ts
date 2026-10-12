import { afterEach, describe, expect, it, vi } from "vitest";
import { fitToBytes, translateToFrench } from "@/lib/translate";
import { needsEnrichment } from "@/lib/enrich-story";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockApi(body: unknown) {
  const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fitToBytes", () => {
  it("keeps short text and cuts long text under the byte limit", () => {
    expect(fitToBytes("Bonjour.")).toBe("Bonjour.");
    const long = "Une phrase complète. ".repeat(40);
    const cut = fitToBytes(long, 100);
    expect(new TextEncoder().encode(cut).length).toBeLessThanOrEqual(100);
    expect(cut.endsWith(".")).toBe(true);
  });
});

describe("translateToFrench", () => {
  it("returns French text unchanged without calling the API", async () => {
    const fetchMock = mockApi({});
    expect(await translateToFrench("Déjà en français.", "fr")).toEqual({ text: "Déjà en français.", sourceLang: "fr" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("translates with auto-detection and decodes entities", async () => {
    const fetchMock = mockApi({
      responseStatus: 200,
      responseData: { translatedText: "Rejoignez la plateforme d&#39;aujourd&#39;hui.", detectedLanguage: "en-US" },
    });
    expect(await translateToFrench("Join today's platform.")).toEqual({
      text: "Rejoignez la plateforme d'aujourd'hui.",
      sourceLang: "en",
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("langpair=autodetect%7Cfr");
  });

  it("returns null on quota warnings and errors", async () => {
    mockApi({ responseStatus: 200, responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS" } });
    expect(await translateToFrench("Hello", "en")).toBeNull();
    mockApi({ responseStatus: 403, responseData: { translatedText: "x" } });
    expect(await translateToFrench("Hello", "en")).toBeNull();
  });
});

describe("needsEnrichment", () => {
  const now = Date.parse("2026-10-12T12:00:00Z");
  const base = { url: "https://exemple.com", excerpt: null, excerptLang: null, imageUrl: null, previewAt: null };
  const ago = (ms: number) => new Date(now - ms);

  it("fetches stories never tried, and ignores text posts", () => {
    expect(needsEnrichment(base, now)).toBe(true);
    expect(needsEnrichment({ ...base, url: null }, now)).toBe(false);
  });

  it("retries untranslated excerpts after an hour", () => {
    const item = { ...base, excerpt: "Hello", excerptLang: "en" };
    expect(needsEnrichment({ ...item, previewAt: ago(10 * 60_000) }, now)).toBe(false);
    expect(needsEnrichment({ ...item, previewAt: ago(2 * 3600_000) }, now)).toBe(true);
  });

  it("leaves complete French previews alone", () => {
    expect(needsEnrichment({ ...base, excerpt: "Salut", excerptLang: "fr", previewAt: ago(1e9) }, now)).toBe(false);
  });
});
