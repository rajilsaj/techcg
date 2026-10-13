import { prisma } from "./db";

/**
 * The site's headline topics. Each one is also a tag (same slug), so stories carry
 * them like any other tag, show them as chips and appear on /etiquette/<slug>.
 */
export const TOPICS = [
  { slug: "evenements", label: "Événements" },
  { slug: "ia", label: "IA" },
  { slug: "entrepreneurs", label: "Entrepreneurs" },
] as const;

export type TopicSlug = (typeof TOPICS)[number]["slug"];

export function isTopic(value: string | null | undefined): value is TopicSlug {
  return TOPICS.some((topic) => topic.slug === value);
}

/** Lowercase, no accents, words separated by single spaces (hyphens and slashes too). */
function normalize(text: string): string {
  return ` ${text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .trim()} `;
}

/**
 * Patterns run on the normalized text (lowercase, no accents, words padded with
 * spaces), except `exact`, which runs on the original text: it's for acronyms
 * like "IA"/"AI" that would otherwise match French words ("j'ai", "via").
 */
const RULES: Record<TopicSlug, { exact?: RegExp; words: RegExp }> = {
  ia: {
    exact: /(?<![\p{L}\p{N}'’.-])(AI|GenAI|LLMs?|AGI)(?![\p{L}\p{N}'’-])/u,
    words:
      /( |')(ia|iag|intelligence artificielle|artificial intelligence|machine learning|apprentissage (automatique|profond)|deep learning|reseaux? de neurones|neural networks?|chatgpt|openai|anthropic|claude (ai|haiku|sonnet|opus|code)|gemini|mistral ai|deepseek|copilot|gpt ?\d|grand modele de langage|large language models?|modeles? de langage|ia generative|generative ai|agents? (ia|d'ia|ai)|chatbots?|midjourney|stable diffusion|nvidia h\d+|hugging ?face|llama \d|ai accelerated|ai powered) /,
  },
  entrepreneurs: {
    words:
      / (start ?ups?|jeunes? pousses?|licornes?|unicorns?|levee de fonds|leve \d+|levees? de fonds|tour de table|seed round|pre seed|serie [abc]|series [abc]|incubateurs?|accelerateurs?|y combinator|techstars|capital risque|venture capital|vc funding|business angels?|french tech|station f|fundraising|raises \$?\d+|valorisation de \d+|entrepreneurs?|entrepreneuses?|entrepreneuriat|entrepreneurial(e|es|s)?|entrepreneurship|auto entrepreneurs?|fondateurs?|fondatrices?|cofondateurs?|co fondateurs?|cofondatrices?|co founders?|cofounders?|founders?|chefs? d'entreprises?|creation d'entreprises?|creer (son|sa|une) entreprise|pme|tpe|small business(es)?|self made) /,
  },
  evenements: {
    words:
      / (evenements?|evenementiel(le|s)?|tech events?|conferences?|sommets?|summit|salons? (de|du|des|international)|hackathons?|webinaires?|webinars?|meetups?|festivals?|keynotes?|forum (economique|mondial|international|africain)|vivatech|viva technology|web summit|ces \d{4}|ces de las vegas|mwc|mobile world congress|wwdc|google i o|microsoft build|aws re invent|devfest|gitex|africatech|ai summit|dreamforce|ouverture des inscriptions|inscriptions ouvertes|save the date) /,
  },
};

/** Topics a story is about, from its title, excerpt, declared keywords and URL. */
export function detectTopics(parts: { title?: string | null; excerpt?: string | null; keywords?: string[] | null; url?: string | null }): TopicSlug[] {
  const text = [parts.title, parts.excerpt, ...(parts.keywords ?? [])].filter(Boolean).join(" . ");
  // Section subdomains and paths ("intelligence-artificielle.developpez.com", "/startups/") count too.
  let urlText = "";
  if (parts.url) {
    try {
      const url = new URL(parts.url);
      urlText = `${url.hostname.split(".").slice(0, -2).join(" ")} ${url.pathname.split("/").slice(0, -1).join(" ")}`;
    } catch {
      // ignore malformed URLs
    }
  }
  const normalized = normalize(`${text} ${urlText}`);

  return TOPICS.map((topic) => topic.slug).filter((slug) => {
    const rule = RULES[slug];
    return rule.words.test(normalized) || (rule.exact?.test(text) ?? false);
  });
}

/** Adds topic tags to a story, keeping the tags it already has. */
export async function addTopicTags(itemId: number, topics: TopicSlug[]): Promise<void> {
  if (topics.length === 0) return;
  const tags = await Promise.all(
    topics.map((slug) => {
      const name = TOPICS.find((topic) => topic.slug === slug)!.label;
      return prisma.tag.upsert({ where: { slug }, create: { name, slug }, update: {}, select: { id: true } });
    })
  );
  await prisma.itemTag.createMany({ data: tags.map((tag) => ({ itemId, tagId: tag.id })), skipDuplicates: true });
}
