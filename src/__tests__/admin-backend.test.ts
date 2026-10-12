import { describe, expect, it } from "vitest";
import { isItemStatus, isPubliclyVisible } from "@/lib/content-status";
import { DEFAULT_SETTINGS, sanitizeSettings } from "@/lib/settings";
import { parseTagNames, slugify } from "@/lib/taxonomy";
import { fromLocalInput, toLocalInput } from "@/lib/local-time";

describe("content status", () => {
  const now = new Date("2026-10-12T12:00:00Z");

  it("shows published items and scheduled ones whose date has passed", () => {
    expect(isPubliclyVisible({ status: "published", publishAt: null }, now)).toBe(true);
    expect(isPubliclyVisible({ status: "scheduled", publishAt: new Date("2026-10-12T11:00:00Z") }, now)).toBe(true);
    expect(isPubliclyVisible({ status: "scheduled", publishAt: new Date("2026-10-13T00:00:00Z") }, now)).toBe(false);
    expect(isPubliclyVisible({ status: "scheduled", publishAt: null }, now)).toBe(false);
  });

  it("hides drafts, pending, spam and trash", () => {
    for (const status of ["draft", "pending", "spam", "trash"]) {
      expect(isPubliclyVisible({ status, publishAt: null }, now)).toBe(false);
    }
  });

  it("recognises valid statuses only", () => {
    expect(isItemStatus("draft")).toBe(true);
    expect(isItemStatus("deleted")).toBe(false);
    expect(isItemStatus(undefined)).toBe(false);
  });
});

describe("sanitizeSettings", () => {
  it("falls back to defaults for missing or malformed values", () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ commentModeration: "sometimes", submissionsOpen: "yes", defaultCategoryId: 1.5, siteName: "   " })).toEqual(
      DEFAULT_SETTINGS
    );
  });

  it("keeps valid values and trims text", () => {
    const s = sanitizeSettings({ siteName: "  Kongo Tech ", commentModeration: "first", submissionsOpen: false, defaultCategoryId: 3 });
    expect(s).toMatchObject({ siteName: "Kongo Tech", commentModeration: "first", submissionsOpen: false, defaultCategoryId: 3 });
  });
});

describe("taxonomy", () => {
  it("slugifies French names", () => {
    expect(slugify("Énergie solaire & réseaux")).toBe("energie-solaire-reseaux");
    expect(slugify("  !!  ")).toBe("");
  });

  it("parses tag lists: trimmed, de-duplicated by slug, at most five", () => {
    expect(parseTagNames(" IA, cloud , ia,  5G, ")).toEqual(["IA", "cloud", "5G"]);
    expect(parseTagNames("a,b,c,d,e,f,g")).toHaveLength(5);
    expect(parseTagNames(undefined)).toEqual([]);
  });
});

describe("Brazzaville local time", () => {
  it("round-trips datetime-local values at UTC+1", () => {
    const date = fromLocalInput("2026-10-12T14:30");
    expect(date?.toISOString()).toBe("2026-10-12T13:30:00.000Z");
    expect(toLocalInput(date)).toBe("2026-10-12T14:30");
  });

  it("rejects malformed input", () => {
    expect(fromLocalInput("12/10/2026 14:30")).toBeNull();
    expect(fromLocalInput(null)).toBeNull();
    expect(toLocalInput(null)).toBe("");
  });
});
