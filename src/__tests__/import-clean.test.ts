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

describe("withoutSiteWideKeywords", () => {
  it("drops keywords most articles of a batch share, keeps the specific ones", async () => {
    const { withoutSiteWideKeywords } = await import("@/lib/importer/run");
    const article = (keywords: string[]) => ({ title: "t", url: "https://x.cd/a", publishedAt: null, summary: null, image: null, keywords });
    const out = withoutSiteWideKeywords([
      article(["streaming RTNC TV", "Congo", "Mines"]),
      article(["streaming RTNC TV", "congo", "Banques"]),
      article(["Streaming RTNC TV", "Congo", "Fintech"]),
      article(["streaming RTNC TV", "Congo"]),
    ]);
    expect(out.map((a) => a.keywords)).toEqual([["Mines"], ["Banques"], ["Fintech"], []]);
    // Two articles: too few to tell boilerplate from a shared topic.
    expect(withoutSiteWideKeywords([article(["Tech"]), article(["Tech"])])[0].keywords).toEqual(["Tech"]);
  });
});

describe("feed boilerplate and titles", () => {
  it("removes WordPress footers and click-here lines from summaries", async () => {
    const { stripFeedBoilerplate } = await import("@/lib/excerpt");
    expect(stripFeedBoilerplate("Cliquez ici pour voir toutes nos vidéos The post Bon début de saison first appeared on Vox Congo .")).toBe("");
    expect(stripFeedBoilerplate("La fibre arrive à Pointe-Noire. The post La fibre arrive appeared first on Exemple.")).toBe("La fibre arrive à Pointe-Noire.");
    expect(stripFeedBoilerplate("Le texte de l'article. L'article Titre est apparu en premier sur Site.")).toBe("Le texte de l'article.");
    expect(stripFeedBoilerplate("Un résumé normal sans rien à retirer.")).toBe("Un résumé normal sans rien à retirer.");
  });

  it("capitalises a title that starts in lowercase", () => {
    expect(cleanTitle("validation sous peu des protocoles")).toBe("Validation sous peu des protocoles");
    expect(cleanTitle("iPhone 18 : les nouveautés")).toBe("iPhone 18 : les nouveautés");
  });
});
