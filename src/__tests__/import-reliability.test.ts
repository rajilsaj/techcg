import { describe, expect, it } from "vitest";
import { duplicateGroups, sameHeadline, titleKey, urlKey } from "@/lib/duplicates";
import { robotsAllow, robotsRules } from "@/lib/importer/robots";
import { scrapeArticleLinks } from "@/lib/importer/parse";

describe("urlKey", () => {
  it("gives one key to the variants of an address", () => {
    const key = urlKey("https://techcentral.co.za/ioco-profit/287279/");
    expect(urlKey("http://www.techcentral.co.za/ioco-profit/287279")).toBe(key);
    expect(urlKey("https://techcentral.co.za/ioco-profit/287279/?utm_source=x&fbclid=y")).toBe(key);
    expect(urlKey("https://techcentral.co.za/ioco-profit/287279/amp/")).toBe(key);
    expect(urlKey("https://actualite.cd/index.php/2026/10/14/rutshuru")).toBe(urlKey("https://actualite.cd/2026/10/14/rutshuru"));
  });

  it("keeps what identifies a different article", () => {
    expect(urlKey("https://site.cg/article?id=1")).not.toBe(urlKey("https://site.cg/article?id=2"));
    expect(urlKey("https://site.cg/a/")).not.toBe(urlKey("https://site.cg/b/"));
    expect(urlKey("https://other.cg/a/")).not.toBe(urlKey("https://site.cg/a/"));
    expect(urlKey("ftp://site.cg/a")).toBeNull();
    expect(urlKey(null)).toBeNull();
  });
});

describe("sameHeadline", () => {
  it("matches the same headline written differently", () => {
    expect(sameHeadline("Kenya avails $100m to accelerate Digital Superhighway", "Kenya avails $100M to accelerate Digital Superhighway - ITWeb")).toBe(true);
    expect(sameHeadline("Débat au sommet CyberSecur : stratégies", "Débat au sommet Cybersecur – stratégies")).toBe(true);
    expect(titleKey("Élection à Brazzaville")).toBe("election a brazzaville");
  });

  it("matches near-identical headlines but not related ones", () => {
    expect(sameHeadline("Kenya avails $100m to accelerate Digital Superhighway programme", "Kenya avails $100m to accelerate its Digital Superhighway programme")).toBe(true);
    expect(sameHeadline("MTN lève 5 millions pour sa fintech", "Airtel lève 5 millions pour sa fintech")).toBe(false);
    expect(sameHeadline("Le Congo lance son plan numérique 2030", "Le Gabon lance son plan numérique 2030")).toBe(false);
    // Too short to judge.
    expect(sameHeadline("Tech", "Tech")).toBe(false);
  });
});

describe("duplicateGroups", () => {
  const item = (id: number, title: string, url: string, day: number, extra: Partial<{ commentCount: number; points: number; viewCount: number }> = {}) => ({
    id,
    title,
    originalTitle: null,
    urlKey: urlKey(url),
    createdAt: new Date(2026, 9, day),
    commentCount: 0,
    points: 1,
    viewCount: 0,
    ...extra,
  });

  it("groups same addresses and same headlines, keeping the most discussed first", () => {
    const groups = duplicateGroups([
      item(1, "Rutshuru : retour au calme à Kiseguro", "https://actualite.cd/2026/10/14/rutshuru", 14),
      item(2, "Rutshuru : retour au calme à Kiseguro", "https://actualite.cd/index.php/2026/10/14/rutshuru", 14, { commentCount: 2 }),
      item(3, "Un autre article sans rapport aucun", "https://site.cg/x", 14),
      item(4, "Journée mondiale de la poste : un réseau postal, des possibilités infinies", "https://arpce.cg/a", 1),
      item(5, "Journée mondiale de la poste : un réseau postal, des possibilités infinies", "https://autre.cg/b", 3),
    ]);
    expect(groups.map((g) => g.map((i) => i.id))).toEqual([[2, 1], [4, 5]]);
  });

  it("does not group the same headline weeks apart", () => {
    const groups = duplicateGroups([
      item(1, "Le point hebdomadaire sur les startups du Congo", "https://site.cg/1", 1),
      item(2, "Le point hebdomadaire sur les startups du Congo", "https://site.cg/2", 25),
    ]);
    expect(groups).toEqual([]);
  });
});

describe("robots.txt", () => {
  const file = `
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php

User-agent: GPTBot
Disallow: /
`;

  it("applies the * group when there is none for us", () => {
    const rules = robotsRules(file);
    expect(robotsAllow(rules, "/2026/10/article")).toBe(true);
    expect(robotsAllow(rules, "/wp-admin/options.php")).toBe(false);
    expect(robotsAllow(rules, "/wp-admin/admin-ajax.php")).toBe(true);
  });

  it("prefers our own group, and understands wildcards", () => {
    const rules = robotsRules(`User-agent: *\nDisallow: /\n\nUser-agent: TechCGBot\nDisallow: /prive/\nDisallow: /*.pdf$`);
    expect(robotsAllow(rules, "/actualites/x")).toBe(true);
    expect(robotsAllow(rules, "/prive/x")).toBe(false);
    expect(robotsAllow(rules, "/docs/rapport.pdf")).toBe(false);
    expect(robotsAllow(rules, "/docs/rapport.pdf?v=2")).toBe(true);
  });

  it("allows everything with an empty Disallow or no file", () => {
    expect(robotsAllow(robotsRules("User-agent: *\nDisallow:"), "/x")).toBe(true);
    expect(robotsAllow(robotsRules(""), "/x")).toBe(true);
  });
});

describe("article links", () => {
  it("takes the headline above a « Lire l'article » button", () => {
    const html = `<main><div><h2>Journée mondiale de la poste : un réseau postal, des possibilités infinies</h2><p>8 octobre 2026</p>
      <a href="/actualites/journee-mondiale-de-la-poste">Lire l'article</a></div>
      <a href="/publications/">Voir toutes nos publications et rapports</a></main>`;
    expect(scrapeArticleLinks(html, new URL("https://www.arpce.cg/"), 10)).toEqual([
      { url: "https://www.arpce.cg/actualites/journee-mondiale-de-la-poste", title: "Journée mondiale de la poste : un réseau postal, des possibilités infinies" },
    ]);
  });
});

describe("shopping deals", () => {
  it("recognises deal posts by their address", async () => {
    const { isDeal } = await import("@/lib/importer/run");
    expect(isDeal("https://www.frandroid.com/bons-plans/3284247_la-montre-huawei-en-promotion")).toBe(true);
    expect(isDeal("https://site.fr/deals/ipad")).toBe(true);
    expect(isDeal("https://www.frandroid.com/android/3285739_whatsapp-permet-desormais")).toBe(false);
    expect(isDeal("https://site.fr/2026/10/promotion-du-numerique-au-congo")).toBe(false);
  });
});
