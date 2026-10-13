import { describe, expect, it } from "vitest";
import { cleanTitle } from "@/lib/importer/run";

describe("cleanTitle", () => {
  it("decodes entities, even double-encoded ones", () => {
    expect(cleanTitle("Halcyon ferme les inscriptions pour l&#39;agriculture")).toBe("Halcyon ferme les inscriptions pour l'agriculture");
    expect(cleanTitle("R&amp;amp;D en Afrique")).toBe("R&D en Afrique");
  });
  it("drops leading emoji (with skin tone and joiners)", () => {
    expect(cleanTitle("👨🏿‍🚀TechCabal Daily – A not-so-Flash deal")).toBe("TechCabal Daily – A not-so-Flash deal");
    expect(cleanTitle("🚀 Lancement")).toBe("Lancement");
  });
  it("keeps normal titles", () => {
    expect(cleanTitle("  RDC : la 5G en préparation  ")).toBe("RDC : la 5G en préparation");
  });
});
