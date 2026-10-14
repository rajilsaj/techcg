import { prisma } from "./db";

export { TOPICS, REGIONS, isTopic, isRegion, type TopicSlug, type RegionSlug } from "./topic-list";
import { REGIONS, TOPICS, type RegionSlug, type TopicSlug } from "./topic-list";

/** Tags set automatically (and by the admin meta picker). */
export type AutoTagSlug = TopicSlug | RegionSlug;
/** Earlier automatic tags, removed when a story's tags are recomputed. */
const LEGACY_AUTO_SLUGS = ["ia"];
const AUTO_SLUGS: string[] = [...TOPICS.map((t) => t.slug), ...REGIONS.map((r) => r.slug), ...LEGACY_AUTO_SLUGS];
/** Slugs of every automatic tag (meta tags, regions, legacy ones). */
export const AUTO_TAG_SLUGS = AUTO_SLUGS;

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

const AI_WORDS =
  "ia|iag|intelligence artificielle|artificial intelligence|machine learning|apprentissage (automatique|profond)|deep learning|reseaux? de neurones|neural networks?|chatgpt|openai|anthropic|claude (ai|haiku|sonnet|opus|code)|gemini|mistral ai|deepseek|copilot|gpt ?\\d|grand modele de langage|large language models?|modeles? de langage|ia generative|generative ai|agents? (ia|d'ia|ai)|chatbots?|midjourney|stable diffusion|nvidia h\\d+|hugging ?face|llama \\d|ai accelerated|ai powered";

const TECH_WORDS =
  "tech|techs|technologies?|technologiques?|technology|numeriques?|digital(e|es|s)?|digitalisation|transformation digitale|informatiques?|logiciels?|software|applications? mobiles?|apps?|smartphones?|telephones? mobiles?|internet|web|cloud|data|donnees (personnelles|massives|ouvertes)|protection des donnees|science des donnees|big data|cybersecurite|cybersecurity|cyberattaques?|hackers?|piratage|fintech|fintechs|mobile money|paiements? (mobiles?|numeriques?|digitaux)|e commerce|ecommerce|telecoms?|telecommunications?|operateurs? (telecoms?|mobiles?)|4g|5g|fibre optique|haut debit|broadband|satellites?|starlink|data centers?|centres? de donnees|semi conducteurs?|semiconductors?|puces?|chips?|processeurs?|gpu|robots?|robotique|drones?|blockchain|crypto(monnaies?|currency|currencies)?|bitcoin|developpeurs?|developers?|programmation|programming|open source|github|linux|windows|android|ios|iphone|ipad|apple|google|microsoft|meta|amazon|samsung|huawei|nvidia|tesla|spacex|tiktok|whatsapp|facebook|instagram|youtube|reseaux sociaux|social media|startup|start up|e gov|e gouvernance|identite numerique|gadgets?|ordinateurs?|laptops?|consoles?|jeux video|gaming|streaming|vr|realite (virtuelle|augmentee)|metaverse|quantique|quantum|edtech|healthtech|agritech|insurtech|proptech|cleantech|climate tech|e sante|e education";

/**
 * Patterns run on the normalized text (lowercase, no accents, words padded with
 * spaces), except `exact`, which runs on the original text: it's for acronyms
 * like "IA"/"AI" that would otherwise match French words ("j'ai", "via").
 */
const RULES: Record<TopicSlug, { exact?: RegExp; words: RegExp; contextual?: RegExp }> = {
  startups: {
    words:
      / (start ?ups?|jeunes? pousses?|licornes?|unicorns?|levee de fonds|leve \d+|levees? de fonds|tour de table|seed round|pre seed|serie [abc]|series [abc]|incubateurs?|accelerateurs?|y combinator|techstars|capital risque|venture capital|vc funding|vcs|business angels?|french tech|station f|fundraising|raises \$?\d+|raised \$?\d+|valorisation de \d+|pre seed|seed funding|acquisition|rachat|rachetee?s?|acquired|exits?|ipo|entree en bourse) /,
  },
  entrepreneurs: {
    words:
      / (entrepreneurs?|entrepreneuses?|entrepreneuriat|entrepreneurial(e|es|s)?|entrepreneurship|auto entrepreneurs?|fondateurs?|fondatrices?|cofondateurs?|co fondateurs?|cofondatrices?|co founders?|cofounders?|founders?|chefs? d'entreprises?|creation d'entreprises?|creer (son|sa|une) entreprise|pme|tpe|sme|smes|small business(es)?|self made|patronat|ceo|pdg (de|du|des|d.)|directeur general|directrice generale) /,
  },
  tech: {
    exact: /(?<![\p{L}\p{N}'’.-])(AI|GenAI|LLMs?|AGI|IA)(?![\p{L}\p{N}'’-])/u,
    words: new RegExp(`( |')(${AI_WORDS}|${TECH_WORDS}) `),
  },
  evenements: {
    // Tech events and explicit event categories: enough on their own.
    words:
      / (evenements?|evenementiel(le|s)?|tech events?|hackathons?|webinaires?|webinars?|meetups?|keynotes?|vivatech|viva technology|web summit|ces \d{4}|ces de las vegas|mwc|mobile world congress|wwdc|google i o|microsoft build|aws re invent|devfest|gitex|africatech|ai summit|dreamforce|startup (week|weekend|day)|demo day|pitch(ing)? (day|night|competition)) /,
    // Generic event words (a congress, a contest, a football match day…) count only with a tech, startup or entrepreneur angle.
    contextual:
      / (conferences?|congres|sommets?|summit|salons? (de|du|des|international)|festivals?|forum (economique|mondial|international|africain)|forums?|ouverture des inscriptions|inscriptions ouvertes|date limite des inscriptions|save the date|competitions?|concours|awards?|prix de l'innovation|ceremonie|journee (mondiale|internationale|nationale)|editions?) /,
  },
};

/** Both Congos: names, people, cities. */
const CONGO_WORDS =
  / (congo|congos|congolais|congolaise|congolaises|rdc|r d c|brazzaville|brazza|pointe noire|dolisie|nkayi|ouesso|owando|impfondo|kinshasa|lubumbashi|goma|bukavu|kisangani|mbuji mayi|kananga|matadi|kolwezi|mbandaka) /;

/** The rest of Africa: the continent, its countries and main tech cities. */
const AFRICA_WORDS =
  / (afrique|africa|africain|africaine|africains|africaines|african|africans|panafricain(e|es|s)?|pan african|subsaharien(ne|nes|s)?|sub saharan|cemac|ceeac|cedeao|ecowas|uemoa|bceao|beac|union africaine|african union|zlecaf|afcfta|nigeria|nigerian|nigerians|nigerian(e|es|s)|kenya|kenyan|kenyans|kenyan(e|es|s)|senegal|senegalais(e|es)?|cameroun|cameroon|camerounais(e|es)?|cote d'ivoire|cote d ivoire|ivory coast|ivoirien(ne|nes|s)?|ghana|ghanaian|ghaneen(ne|nes|s)?|rwanda|rwandais(e|es)?|rwandan|maroc|morocco|marocain(e|es|s)?|egypte|egypt|egyptian|egyptien(ne|nes|s)?|afrique du sud|south africa|south african|sud africain(e|es|s)?|ethiopie|ethiopia|ethiopian|tanzanie|tanzania|ouganda|uganda|benin|beninois(e|es)?|togo|togolais(e|es)?|gabon|gabonais(e|es)?|centrafrique|centrafricain(e|es|s)?|tchad|chad|angola|zambie|zambia|zimbabwe|mozambique|madagascar|malgache|tunisie|tunisia|tunisien(ne|nes|s)?|algerie|algeria|algerien(ne|nes|s)?|mali|malien(ne|nes|s)?|burkina faso|burkinabe|niger|guinee|guinea|mauritanie|mauritania|burundi|namibie|namibia|botswana|malawi|somalie|somalia|soudan|sudan|libye|libya|cap vert|cape verde|ile maurice|mauritius|seychelles|djibouti|erythree|eritrea|eswatini|lesotho|sierra leone|liberia|gambie|gambia|lagos|abuja|nairobi|mombasa|dakar|abidjan|accra|kigali|douala|yaounde|libreville|addis abeba|addis ababa|le caire|cairo|casablanca|rabat|tunis|alger|johannesburg|cape town|kampala|dar es salaam|lusaka|harare|luanda|maputo|bamako|ouagadougou|niamey|conakry|lome|cotonou|ndjamena|bangui|malabo) /;

/** Websites that only cover Africa: their stories are African unless they're about Congo. */
const AFRICAN_SITES = /(^|\.)(wearetech\.africa|digitalbusiness\.africa|techcabal\.com|techinafrica\.com|techpoint\.africa|disrupt-africa\.com|weetracker\.com|agenceecofin\.com|cio-mag\.com|ticmag\.net|jeuneafrique\.com|africanews\.com|itnewsafrica\.com)$/i;
/** African country-code domains (.ng, .ke…) and .africa. */
const AFRICAN_TLDS = /\.(africa|ng|ke|sn|cm|ci|gh|rw|ma|za|eg|et|tz|ug|bj|tg|ga|cf|td|ao|zm|zw|mz|mg|tn|dz|ml|bf|ne|gn|mr|bi|na|bw|mw|so|sd|ly|cv|mu|sc|dj|er|sz|ls|sl|lr|gm|gq|ss|st|km)$/i;

function hostname(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Whether a story is about Congo: the words above, or a .cg / .cd website. */
export function isCongoStory(text: string, url?: string | null): boolean {
  return /\.(cg|cd)$/i.test(hostname(url)) || CONGO_WORDS.test(normalize(text));
}

/** Congo first, then the rest of Africa; null for the rest of the world. */
export function detectRegion(text: string, url?: string | null): RegionSlug | null {
  if (isCongoStory(text, url)) return "congo";
  const host = hostname(url);
  if (AFRICAN_SITES.test(host) || AFRICAN_TLDS.test(host) || AFRICA_WORDS.test(normalize(text))) return "afrique";
  return null;
}

/** Number of different terms of `pattern` found in `text` ("startup", "levée de fonds"… count once each). */
function distinctTerms(pattern: RegExp, text: string): number {
  const terms = new Set<string>();
  for (const m of text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))) {
    // The tech pattern starts with a "( |')" group: the term is then the second group.
    const term = m[1] !== undefined && /^[ ']$/.test(m[1]) ? m[2] : m[1] ?? m[0];
    terms.add((term ?? m[0]).trim());
  }
  return terms.size;
}

/**
 * Meta tags and region of a story, from its title, excerpt, declared keywords and URL.
 *
 * `strict` (sources set to « Filtrer » in the admin: general-news sites): a topic
 * counts only when its words are in the title, or when at least two different
 * terms of it appear in the text, so one passing mention ("streaming", "numérique")
 * doesn't make a politics story a tech one.
 */
export function detectTopics(
  parts: { title?: string | null; excerpt?: string | null; keywords?: string[] | null; url?: string | null },
  { strict = false }: { strict?: boolean } = {}
): AutoTagSlug[] {
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

  const title = parts.title ?? "";
  const titleNormalized = normalize(title);
  const matches = (slug: TopicSlug) => {
    const rule = RULES[slug];
    const anywhere = rule.words.test(normalized) || (rule.exact?.test(text) ?? false);
    if (!strict || !anywhere) return anywhere;
    if (rule.words.test(titleNormalized) || rule.exact?.test(title)) return true;
    return distinctTerms(rule.words, normalized) + (rule.exact ? distinctTerms(rule.exact, text) : 0) >= 2;
  };
  const found = new Set(TOPICS.map((topic) => topic.slug).filter(matches));
  // "Concours", "congrès", "forum"… are events for this site only around tech, startups or entrepreneurs.
  const ecosystem = found.has("tech") || found.has("startups") || found.has("entrepreneurs");
  if (!found.has("evenements") && ecosystem && RULES.evenements.contextual?.test(normalized)) found.add("evenements");
  const topics: AutoTagSlug[] = TOPICS.map((topic) => topic.slug).filter((slug) => found.has(slug));
  const region = detectRegion(text, parts.url);
  return region ? [...topics, region] : topics;
}

const AUTO_LABELS: Record<string, string> = Object.fromEntries([...TOPICS, ...REGIONS].map((t) => [t.slug, t.label]));

/**
 * Sets a story's automatic tags (meta tags + region) to exactly `slugs`, keeping
 * its other tags. Used by the importer, the preview job and the admin meta picker.
 */
export async function setAutoTags(itemId: number, slugs: AutoTagSlug[]): Promise<void> {
  const wanted = [...new Set(slugs)].filter((slug) => slug in AUTO_LABELS);
  const tags = await Promise.all(
    wanted.map((slug) => prisma.tag.upsert({ where: { slug }, create: { name: AUTO_LABELS[slug], slug }, update: {}, select: { id: true } }))
  );
  await prisma.$transaction([
    prisma.itemTag.deleteMany({ where: { itemId, tag: { slug: { in: AUTO_SLUGS.filter((s) => !wanted.includes(s as AutoTagSlug)) } } } }),
    prisma.itemTag.createMany({ data: tags.map((tag) => ({ itemId, tagId: tag.id })), skipDuplicates: true }),
  ]);
}


/** Whether a tag is one of the automatic ones (meta tag, region or a legacy one). */
export function isAutoTag(slug: string): boolean {
  return AUTO_SLUGS.includes(slug);
}
