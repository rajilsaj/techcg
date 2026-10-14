import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const { detectRegion, detectTopics, isCongoStory } = await import("@/lib/topics");
const { parseStoryFilters, filtersQuery, filtersWhere } = await import("@/lib/story-filters");
const { parseFeed } = await import("@/lib/importer/parse");

describe("detectTopics", () => {
  it("files AI and tech news under Tech without matching French words", () => {
    expect(detectTopics({ title: "Satya Nadella estime que tous les modèles d'IA sont « compromis »" })).toEqual(["tech"]);
    expect(detectTopics({ title: "Epic shifts to ‘AI-accelerated development’ for upcoming Disney game" })).toEqual(["tech"]);
    expect(detectTopics({ title: "OpenAI lance un nouveau modèle" })).toEqual(["tech"]);
    expect(detectTopics({ title: "Where to preorder the new Apple TV 4K" })).toEqual(["tech"]);
    // "j'ai", "via", "mai" are not AI.
    expect(detectTopics({ title: "J'ai reçu le colis via la poste en mai" })).toEqual([]);
  });

  it("separates startups from entrepreneurs, and spots events", () => {
    expect(detectTopics({ title: "Une start-up congolaise lève 2 millions de dollars" })).toEqual(["startups", "tech", "congo"]);
    expect(detectTopics({ title: "Rencontre avec la fondatrice de Kinshasa Digital" })).toEqual(["entrepreneurs", "tech", "congo"]);
    expect(detectTopics({ title: "Le hackathon de Brazzaville ouvre ses inscriptions" })).toEqual(["evenements", "congo"]);
    expect(detectTopics({ title: "VivaTech 2026 : les startups africaines de l'IA à l'honneur" })).toEqual(["startups", "tech", "evenements", "afrique"]);
  });

  it("uses declared keywords and section subdomains", () => {
    expect(detectTopics({ title: "Une étude sur la concentration", url: "https://intelligence-artificielle.developpez.com/actu/1/x/" })).toEqual(["tech"]);
    expect(detectTopics({ title: "Article à Dakar", keywords: ["Événementiel"] })).toEqual(["evenements", "afrique"]);
  });

  it("tells Congo, the rest of Africa and the world apart", () => {
    expect(detectRegion("RDC : la 5G en préparation")).toBe("congo");
    expect(detectRegion("Kenya : Microsoft ferme son centre de Nairobi")).toBe("afrique");
    expect(detectRegion("NeoFleet Capital raises $4M to finance taxi fleets in Senegal")).toBe("afrique");
    expect(detectRegion("Un article sans pays", "https://techcabal.com/2026/10/13/x")).toBe("afrique");
    expect(detectRegion("Apple dévoile un nouvel iPad", "https://www.theverge.com/x")).toBeNull();
    expect(detectRegion("M-KOPA passe le cap des 600 millions de dollars")).toBeNull();
  });
});

describe("feed categories", () => {
  it("reads RSS and Atom categories as keywords", () => {
    const xml = `<rss><channel><item><title>Un titre assez long</title><link>https://a.com/1</link>
      <category><![CDATA[Intelligence artificielle]]></category><category>Startups, Financement</category></item></channel></rss>`;
    expect(parseFeed(xml, new URL("https://a.com/")).articles[0].keywords).toEqual(["Intelligence artificielle", "Startups", "Financement"]);
    const atom = `<feed><entry><title>T</title><link href="https://a.com/2"/><category term="AI" label="Artificial Intelligence"/></entry></feed>`;
    expect(parseFeed(atom, new URL("https://a.com/")).articles[0].keywords).toEqual(["Artificial Intelligence"]);
  });
});

describe("story filters", () => {
  it("keeps valid values only and defaults to the latest news", () => {
    const f = parseStoryFilters({ q: "  rust   wasm ", sujet: "tech", site: "https://www.Exemple.com/page", auteur: "x'; drop", periode: "7j", tri: "bogus" });
    expect(f).toEqual({ q: "rust wasm", topic: "tech", category: "", site: "exemple.com", author: "", period: "7j", sort: "newest" });
    expect(parseStoryFilters({ sujet: "ia" }).topic).toBeNull();
    expect(filtersQuery(f).toString()).toBe("q=rust+wasm&sujet=tech&site=exemple.com&periode=7j");
    expect(filtersQuery(parseStoryFilters({ tri: "points" })).toString()).toBe("tri=points");
  });

  it("requires every search word", () => {
    const where = filtersWhere(parseStoryFilters({ q: "rust wasm" }));
    expect((where.AND as unknown[]).length).toBe(2);
    expect(filtersWhere(parseStoryFilters({}))).toEqual({});
  });
});

describe("isCongoStory", () => {
  it("spots both Congos, their cities and .cg/.cd sites", () => {
    expect(isCongoStory("RDC : la 5G en préparation")).toBe(true);
    expect(isCongoStory("Fibre optique : après le Cameroun et le Congo, la Centrafrique veut s'interconnecter")).toBe(true);
    expect(isCongoStory("Pointe-Noire accueille un nouveau data center")).toBe(true);
    expect(isCongoStory("Les opérateurs congolais baissent leurs prix")).toBe(true);
    expect(isCongoStory("Une annonce", "https://www.adiac-congo.cg/article/1")).toBe(true);
    expect(isCongoStory("Une annonce", "https://actualite.cd/2026/10/13/x")).toBe(true);
  });
  it("leaves other countries alone", () => {
    expect(isCongoStory("Kenya : Microsoft ferme son centre de Nairobi")).toBe(false);
    expect(isCongoStory("Oyo State launches a tech hub in Nigeria")).toBe(false);
    expect(isCongoStory("Le Cameroun lance son identité numérique", "https://www.digitalbusiness.africa/x")).toBe(false);
  });
});

describe("events need a tech angle unless they are tech events", () => {
  it("tags a contest or congress as an event only around tech, startups or entrepreneurs", async () => {
    const { detectTopics } = await import("@/lib/topics");
    expect(detectTopics({ title: "10e Congrès de cardiologie à Bujumbura" })).not.toContain("evenements");
    expect(detectTopics({ title: "Primus Ligue : le concours des supporters" })).not.toContain("evenements");
    expect(detectTopics({ title: "Concours d'innovation pour les startups de Kinshasa" })).toContain("evenements");
    expect(detectTopics({ title: "GITEX Africa ouvre ses portes à Marrakech" })).toContain("evenements");
  });
});

describe("strict detection (general-news sources)", () => {
  it("needs the topic in the title, or two different topic terms", async () => {
    const { detectTopics } = await import("@/lib/topics");
    const politics = { title: "Les coupures d'électricité impactent Brazzaville", excerpt: "Regardez notre reportage en streaming sur notre chaîne." };
    expect(detectTopics(politics)).toContain("tech");
    expect(detectTopics(politics, { strict: true })).not.toContain("tech");
    expect(detectTopics({ title: "La fintech Kelasi lance son application", excerpt: "Rien d'autre." }, { strict: true })).toContain("tech");
    expect(
      detectTopics({ title: "Brazzaville : une nouvelle offre pour les ménages", excerpt: "L'opérateur déploie la fibre optique et la 5G dans trois arrondissements." }, { strict: true })
    ).toContain("tech");
    expect(detectTopics({ title: "Gouvernance", excerpt: "Le directeur général a présenté le bilan. Les entrepreneurs et les PME ont salué la réforme." }, { strict: true })).toContain(
      "entrepreneurs"
    );
  });
});

describe("events are Congo or Africa only", () => {
  it("drops the event tag for events elsewhere", async () => {
    const { detectTopics } = await import("@/lib/topics");
    expect(detectTopics({ title: "CES 2027 : les nouveautés de Las Vegas", excerpt: "Les smartphones et la tech du salon." })).not.toContain("evenements");
    expect(detectTopics({ title: "Le hackathon de Pointe-Noire ouvre ses inscriptions" })).toEqual(["evenements", "congo"]);
  });
});
