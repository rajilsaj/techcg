import { describe, expect, it } from "vitest";
import { detectLocale, preferredLanguage, pluralize, translate } from "@/i18n";

describe("preferredLanguage", () => {
  it("picks the highest q-value primary subtag", () => {
    expect(preferredLanguage("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(preferredLanguage("fr-CA;q=0.7,en;q=0.5")).toBe("fr");
    expect(preferredLanguage("*")).toBeNull();
    expect(preferredLanguage(null)).toBeNull();
  });
});

describe("detectLocale", () => {
  it("honours an explicit cookie above everything", () => {
    expect(detectLocale({ cookie: "en", country: "CG", acceptLanguage: "fr" })).toBe("en");
    expect(detectLocale({ cookie: "fr", country: "US", acceptLanguage: "en" })).toBe("fr");
  });

  it("ignores an invalid cookie", () => {
    expect(detectLocale({ cookie: "de", country: "US" })).toBe("en");
  });

  it("uses French for francophone countries regardless of browser language", () => {
    for (const country of ["CG", "CD", "CM", "GA", "cf", "FR", "SN"]) {
      expect(detectLocale({ country, acceptLanguage: "en-US" })).toBe("fr");
    }
  });

  it("uses the browser language for other known countries", () => {
    expect(detectLocale({ country: "CA", acceptLanguage: "fr-CA,fr;q=0.9" })).toBe("fr");
    expect(detectLocale({ country: "CA", acceptLanguage: "en-CA" })).toBe("en");
    expect(detectLocale({ country: "DE", acceptLanguage: "de" })).toBe("en");
    expect(detectLocale({ country: "US" })).toBe("en");
  });

  it("falls back to the site default when the country is unknown", () => {
    expect(detectLocale({})).toBe("fr");
    expect(detectLocale({ acceptLanguage: "de" })).toBe("fr");
    expect(detectLocale({ acceptLanguage: "en" })).toBe("en");
  });
});

describe("translate", () => {
  it("interpolates placeholders and leaves unknown ones intact", () => {
    expect(translate("fr", "nav.top")).toBe("À la une");
    expect(translate("en", "nav.top")).toBe("Top");
  });
});

describe("pluralize", () => {
  it("applies French and English rules", () => {
    expect(pluralize(0, "fr", "commentaire")).toBe("commentaire");
    expect(pluralize(1, "fr", "commentaire")).toBe("commentaire");
    expect(pluralize(2, "fr", "commentaire")).toBe("commentaires");
    expect(pluralize(0, "en", "comment")).toBe("comments");
    expect(pluralize(1, "en", "comment")).toBe("comment");
    expect(pluralize(2, "en", "comment")).toBe("comments");
  });
});
