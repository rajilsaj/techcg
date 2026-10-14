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
  it("drops a trailing ' | site name'", () => {
    expect(cleanTitle("Éducation : plus de CEPE à partir de cette année | adiac-congo.com : toute l'actualité du Bassin du Congo")).toBe(
      "Éducation : plus de CEPE à partir de cette année"
    );
    expect(cleanTitle("Short | Site")).toBe("Short | Site");
  });
  it("keeps normal titles", () => {
    expect(cleanTitle("  RDC : la 5G en préparation  ")).toBe("RDC : la 5G en préparation");
  });
});

describe("decodeEntities", () => {
  it("decodes text a site encoded twice", async () => {
    const { decodeEntities } = await import("@/lib/link-preview");
    expect(decodeEntities("afin d&amp;#39;accompagner l&#39;&eacute;quipe &amp; ses &amp;quot;amis&amp;quot;")).toBe(
      "afin d'accompagner l'équipe & ses \"amis\""
    );
  });
});
