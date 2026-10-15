import { afterEach, describe, expect, it, vi } from "vitest";
import { detectLanguage, isFrench } from "@/lib/language";
import { translateToFrench } from "@/lib/translate";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("detectLanguage", () => {
  it("tells French, English, Portuguese and Spanish apart", () => {
    expect(detectLanguage("Le Congo lance son plan pour le numérique et la fibre")).toBe("fr");
    expect(detectLanguage("8 states are suing OpenAI, saying ChatGPT harms kids")).toBe("en");
    expect(detectLanguage("Ciberataque expõe dados não classificados das secretas portuguesas")).toBe("pt");
    expect(detectLanguage("Angola reforça Programa Espacial Nacional com formação, inovação e acordos")).toBe("pt");
    expect(detectLanguage("El gobierno lanza una nueva estrategia de ciberseguridad según el ministerio")).toBe("es");
  });

  it("says nothing when it can't tell", () => {
    expect(detectLanguage("iPhone 17")).toBeNull();
    expect(detectLanguage("")).toBeNull();
  });

  it("trusts the text over the declared language", () => {
    expect(isFrench("New Delhi, Oct. 14 -- Scimplify, a startup that helps companies develop and manufacture", "fr")).toBe(false);
    expect(isFrench("Meta lança novos modelos de IA para reforçar concorrência com OpenAI", "fr")).toBe(false);
    expect(isFrench("Samsung Galaxy S27", "fr")).toBe(true);
  });
});

describe("translateToFrench with wrong detection", () => {
  it("translates Portuguese the API would take for French", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(new URL(url).searchParams.get("langpair")).toBe("pt|fr");
      return new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: "La cyberattaque expose des données non classifiées des services secrets portugais", detectedLanguage: "fr" } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateToFrench("Ciberataque expõe dados não classificados das secretas portuguesas", "fr")).toEqual({
      text: "La cyberattaque expose des données non classifiées des services secrets portugais",
      sourceLang: "pt",
    });
  });

  it("refuses a « translation » that is still English", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: "8 states are suing OpenAI over the safety of kids", detectedLanguage: "en" } }))));
    expect(await translateToFrench("8 states are suing OpenAI over the safety of kids", "en")).toBeNull();
  });
});

describe("next scheduled update", () => {
  it("is the next :00 or :30 after the last update", async () => {
    const { nextSlot } = await import("@/lib/import-status");
    expect(new Date(nextSlot(Date.UTC(2026, 9, 15, 8, 1, 35))).toISOString()).toBe("2026-10-15T08:30:00.000Z");
    expect(new Date(nextSlot(Date.UTC(2026, 9, 15, 8, 30, 0))).toISOString()).toBe("2026-10-15T09:00:00.000Z");
  });
});
