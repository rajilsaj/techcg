import { describe, expect, it } from "vitest";
import { formatRelativeTime, pluralize, t } from "@/i18n";

describe("t", () => {
  it("returns French copy and interpolates placeholders", () => {
    expect(t("nav.top")).toBe("À la une");
    expect(t("user.karmaJoined", { karma: 3 })).toBe("3 karma · inscription {time}");
  });
});

describe("formatRelativeTime", () => {
  it("formats in French", () => {
    expect(formatRelativeTime(new Date())).toBe("à l'instant");
    expect(formatRelativeTime(new Date(Date.now() - 2 * 3600_000))).toBe("il y a 2 h");
  });
});

describe("pluralize", () => {
  it("applies the French rule (0 and 1 are singular)", () => {
    expect(pluralize(0, "commentaire")).toBe("commentaire");
    expect(pluralize(1, "commentaire")).toBe("commentaire");
    expect(pluralize(2, "commentaire")).toBe("commentaires");
  });
});
