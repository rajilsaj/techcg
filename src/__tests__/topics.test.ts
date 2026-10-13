import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const { detectTopics } = await import("@/lib/topics");
const { parseStoryFilters, filtersQuery, filtersWhere } = await import("@/lib/story-filters");
const { parseFeed } = await import("@/lib/importer/parse");

describe("detectTopics", () => {
  it("spots AI in French and English without matching French words", () => {
    expect(detectTopics({ title: "Satya Nadella estime que tous les modèles d'IA sont « compromis »" })).toEqual(["ia"]);
    expect(detectTopics({ title: "Epic shifts to ‘AI-accelerated development’ for upcoming Disney game" })).toEqual(["ia"]);
    expect(detectTopics({ title: "OpenAI lance un nouveau modèle" })).toEqual(["ia"]);
    // "j'ai", "via", "mai" are not AI.
    expect(detectTopics({ title: "J'ai testé la livraison via drone en mai" })).toEqual([]);
    expect(detectTopics({ title: "Where to preorder the new Apple TV 4K" })).toEqual([]);
  });

  it("files startups and founders under Entrepreneurs, and spots events", () => {
    expect(detectTopics({ title: "Une start-up congolaise lève 2 millions de dollars" })).toEqual(["entrepreneurs"]);
    expect(detectTopics({ title: "Rencontre avec la fondatrice de Kinshasa Digital" })).toEqual(["entrepreneurs"]);
    expect(detectTopics({ title: "Le hackathon de Brazzaville ouvre ses inscriptions" })).toEqual(["evenements"]);
    expect(detectTopics({ title: "VivaTech 2026 : les startups africaines de l'IA à l'honneur" })).toEqual(["evenements", "ia", "entrepreneurs"]);
  });

  it("uses declared keywords and section subdomains", () => {
    expect(detectTopics({ title: "Une étude sur la concentration", url: "https://intelligence-artificielle.developpez.com/actu/1/x/" })).toEqual(["ia"]);
    expect(detectTopics({ title: "Article", keywords: ["Événementiel"] })).toEqual(["evenements"]);
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
    const f = parseStoryFilters({ q: "  rust   wasm ", sujet: "ia", site: "https://www.Exemple.com/page", auteur: "x'; drop", periode: "7j", tri: "bogus" });
    expect(f).toEqual({ q: "rust wasm", topic: "ia", category: "", site: "exemple.com", author: "", period: "7j", sort: "newest" });
    expect(parseStoryFilters({ sujet: "startups" }).topic).toBeNull();
    expect(filtersQuery(f).toString()).toBe("q=rust+wasm&sujet=ia&site=exemple.com&periode=7j");
    expect(filtersQuery(parseStoryFilters({ tri: "points" })).toString()).toBe("tri=points");
  });

  it("requires every search word", () => {
    const where = filtersWhere(parseStoryFilters({ q: "rust wasm" }));
    expect((where.AND as unknown[]).length).toBe(2);
    expect(filtersWhere(parseStoryFilters({}))).toEqual({});
  });
});
