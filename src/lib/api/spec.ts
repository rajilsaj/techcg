/*
 * The API's description, written once: the documentation page (/api), the
 * OpenAPI file (/api/v1/openapi.json) and the index (/api/v1) are all built
 * from it. Add an endpoint here when you add a route under src/app/api/v1.
 */

export type Auth = "none" | "optional" | "required";

export interface Param {
  name: string;
  in: "path" | "query";
  type: "string" | "integer";
  description: string;
  enum?: readonly string[];
  example?: string | number;
  required?: boolean;
}

export interface Field {
  name: string;
  type: "string" | "integer" | "string[]";
  required?: boolean;
  description: string;
}

export interface Endpoint {
  id: string;
  group: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  description?: string;
  auth: Auth;
  params?: Param[];
  body?: Field[];
  /** Example request body. */
  example?: Record<string, unknown>;
  /** Example response (shortened). */
  response: unknown;
  status?: number;
}

export const GROUPS = [
  { id: "stories", name: "Publications", description: "Les articles, questions, vitrines et offres d'emploi, avec les mêmes tris et filtres que le site." },
  { id: "comments", name: "Commentaires et votes", description: "Réagir à une publication." },
  { id: "discussions", name: "Discussions", description: "Les conversations « En discussion »." },
  { id: "directory", name: "Annuaires", description: "Sources, Profiles.CG, sujets et membres." },
  { id: "account", name: "Compte", description: "Le membre à qui appartient la clé." },
] as const;

const author = { username: "rajil_vembe", avatarUrl: "https://www.gravatar.com/avatar/…?d=identicon" };

const story = {
  id: 1104,
  type: "story",
  title: "Afrique centrale : Brazzaville accueillera le premier sommet Force 36",
  url: "https://www.adiac-congo.com/content/…",
  domain: "adiac-congo.com",
  text: null,
  excerpt: "Le premier sommet Force 36 et le Gala de la RSE se tiendront à Brazzaville…",
  imageUrl: "https://www.adiac-congo.com/sites/default/files/…jpg",
  topics: ["evenements"],
  region: "congo",
  tags: [
    { slug: "evenements", name: "Événements" },
    { slug: "congo", name: "Congo" },
  ],
  category: null,
  points: 3,
  comments: 1,
  views: 12,
  author,
  createdAt: "2026-10-14T08:40:00.000Z",
  vote: 0,
  links: {
    web: "https://techcg.vercel.app/publication/1104",
    discussion: "https://techcg.vercel.app/discussions/1104",
    api: "https://techcg.vercel.app/api/v1/stories/1104",
  },
};

const comment = { id: 1150, storyId: 1104, text: "Très bonne nouvelle pour l'écosystème !", points: 1, author, createdAt: "2026-10-14T08:56:18.100Z" };

const pagination = (name: string): Param => ({
  name,
  in: "query",
  type: name === "cursor" ? "string" : "integer",
  description:
    name === "cursor"
      ? "Page suivante : la valeur meta.nextCursor de la réponse précédente."
      : name === "before"
        ? "Page suivante : la valeur meta.nextBefore de la réponse précédente."
        : "Nombre d'éléments (30 par défaut, 100 au plus).",
});

const id: Param = { name: "id", in: "path", type: "integer", description: "Identifiant de la publication.", example: 1104, required: true };

export const ENDPOINTS: Endpoint[] = [
  // Publications
  {
    id: "listStories",
    group: "stories",
    method: "GET",
    path: "/stories",
    summary: "Lister les publications",
    description:
      "Par défaut, ce qu'affiche la page d'accueil : les articles classés Tech, Startups, Entrepreneurs ou Événements, du plus récent au plus ancien. Pagination par curseur.",
    auth: "optional",
    params: [
      { name: "sort", in: "query", type: "string", enum: ["newest", "popular", "discussed", "trending", "top"], description: "newest = les plus récents · popular = les plus consultés · discussed = les plus commentés · trending = tendance · top = les mieux notés.", example: "popular" },
      { name: "topic", in: "query", type: "string", enum: ["tech", "startups", "entrepreneurs", "evenements"], description: "Un sujet." },
      { name: "region", in: "query", type: "string", enum: ["congo", "afrique"], description: "Congo, ou le reste de l'Afrique." },
      { name: "q", in: "query", type: "string", description: "Recherche (titre, extrait, étiquettes).", example: "fintech" },
      { name: "site", in: "query", type: "string", description: "Domaine de l'article, ex. adiac-congo.com." },
      { name: "author", in: "query", type: "string", description: "Nom d'utilisateur de l'auteur." },
      { name: "period", in: "query", type: "string", enum: ["24h", "7j", "30j", "1an"], description: "Publiées sur cette période." },
      { name: "type", in: "query", type: "string", enum: ["story", "ask", "show", "job"], description: "story (par défaut), ask = questions / sujets libres, show = vitrine, job = emplois." },
      { name: "scope", in: "query", type: "string", enum: ["home", "all"], description: "home (par défaut) = seulement les articles classés dans un sujet ; all = tout." },
      pagination("limit"),
      pagination("cursor"),
    ],
    response: { data: [story], meta: { sort: "newest", limit: 30, nextCursor: "eyJrZXkiOjExMDQsImlkIjoxMTA0fQ" } },
  },
  {
    id: "getStory",
    group: "stories",
    method: "GET",
    path: "/stories/{id}",
    summary: "Lire une publication",
    auth: "optional",
    params: [id],
    response: { data: story },
  },
  {
    id: "createStory",
    group: "stories",
    method: "POST",
    path: "/stories",
    summary: "Publier",
    description:
      "Un lien (url) ou un texte (text). Un lien déjà partagé ces 14 derniers jours n'est pas republié : votre vote va à la publication existante (meta.duplicate = true, statut 200). Limite : 5 publications par heure.",
    auth: "required",
    body: [
      { name: "title", type: "string", required: true, description: "Titre (500 caractères au plus)." },
      { name: "url", type: "string", description: "Lien de l'article (http ou https)." },
      { name: "text", type: "string", description: "Texte, si pas de lien (ou avec un lien pour type ask/show)." },
      { name: "type", type: "string", description: "story (par défaut), ask, show ou job." },
      { name: "tags", type: "string[]", description: "Étiquettes (5 au plus)." },
      { name: "categoryId", type: "integer", description: "Catégorie (voir /topics)." },
    ],
    example: { title: "Lancement d'un incubateur à Pointe-Noire", url: "https://exemple.cg/incubateur", tags: ["startups"] },
    status: 201,
    response: { data: story, meta: { duplicate: false } },
  },
  {
    id: "updateStory",
    group: "stories",
    method: "PATCH",
    path: "/stories/{id}",
    summary: "Modifier une publication",
    description: "Réservé à l'auteur (ou à un administrateur).",
    auth: "required",
    params: [id],
    body: [
      { name: "title", type: "string", description: "Nouveau titre." },
      { name: "text", type: "string", description: "Nouveau texte (pas pour un lien)." },
    ],
    example: { title: "Nouveau titre" },
    response: { data: story },
  },
  {
    id: "deleteStory",
    group: "stories",
    method: "DELETE",
    path: "/stories/{id}",
    summary: "Supprimer une publication",
    description: "La met à la corbeille. Réservé à l'auteur (ou à un administrateur).",
    auth: "required",
    params: [id],
    response: { data: { id: 1104, deleted: true } },
  },

  // Comments and votes
  {
    id: "listStoryComments",
    group: "comments",
    method: "GET",
    path: "/stories/{id}/comments",
    summary: "Commentaires d'une publication",
    description: "Du plus récent au plus ancien.",
    auth: "none",
    params: [id, pagination("limit"), pagination("before")],
    response: { data: [comment], meta: { limit: 50, nextBefore: null } },
  },
  {
    id: "createComment",
    group: "comments",
    method: "POST",
    path: "/stories/{id}/comments",
    summary: "Commenter",
    description:
      "Selon la modération choisie par l'administrateur, le commentaire peut attendre une validation (status « pending »). Limite : 30 messages par heure.",
    auth: "required",
    params: [id],
    body: [{ name: "text", type: "string", required: true, description: "Le message (10 000 caractères au plus)." }],
    example: { text: "Très bonne nouvelle pour l'écosystème !" },
    status: 201,
    response: { data: { id: 1151, storyId: 1104, status: "published" } },
  },
  {
    id: "listComments",
    group: "comments",
    method: "GET",
    path: "/comments",
    summary: "Derniers commentaires du site",
    auth: "none",
    params: [{ name: "storyId", in: "query", type: "integer", description: "Seulement ceux d'une publication." }, pagination("limit"), pagination("before")],
    response: { data: [comment], meta: { limit: 50, nextBefore: 1149 } },
  },
  {
    id: "vote",
    group: "comments",
    method: "POST",
    path: "/votes",
    summary: "Voter",
    description: "Pour (1, par défaut) ou contre (-1). Renvoyer la même valeur retire le vote. Les comptes de moins de 24 heures ne votent pas.",
    auth: "required",
    body: [
      { name: "itemId", type: "integer", required: true, description: "Publication ou commentaire." },
      { name: "value", type: "integer", description: "1 ou -1." },
    ],
    example: { itemId: 1104, value: 1 },
    response: { data: { itemId: 1104, vote: 1, points: 4 } },
  },

  // Discussions
  {
    id: "listDiscussions",
    group: "discussions",
    method: "GET",
    path: "/discussions",
    summary: "Conversations en cours",
    description: "Les conversations actives ces 30 derniers jours, de la plus récente à la plus ancienne activité.",
    auth: "none",
    params: [{ name: "type", in: "query", type: "string", enum: ["article", "libre"], description: "Sur un article, ou sujets libres." }],
    response: {
      data: [
        {
          id: 1104,
          kind: "article",
          title: story.title,
          url: story.url,
          imageUrl: story.imageUrl,
          messages: 1,
          lastActivityAt: "2026-10-14T08:56:18.100Z",
          lastMessage: { username: "rajil_vembe", text: "Très bonne nouvelle pour l'écosystème !" },
          participants: [author],
          links: { web: "https://techcg.vercel.app/discussions/1104", api: "https://techcg.vercel.app/api/v1/discussions/1104" },
        },
      ],
    },
  },
  {
    id: "getDiscussion",
    group: "discussions",
    method: "GET",
    path: "/discussions/{id}",
    summary: "Lire une conversation",
    description: "La publication et ses messages, du plus ancien au plus récent (les 300 derniers). Pour répondre : POST /stories/{id}/comments.",
    auth: "optional",
    params: [id],
    response: { data: { story, messages: [{ id: 1150, text: comment.text, author, mine: false, createdAt: comment.createdAt }] } },
  },
  {
    id: "createDiscussion",
    group: "discussions",
    method: "POST",
    path: "/discussions",
    summary: "Lancer un sujet libre",
    auth: "required",
    body: [
      { name: "title", type: "string", required: true, description: "Le sujet." },
      { name: "text", type: "string", required: true, description: "Le premier message." },
    ],
    example: { title: "Quel cloud pour une startup à Brazzaville ?", text: "Vos retours d'expérience ?" },
    status: 201,
    response: { data: { id: 1402, links: { web: "https://techcg.vercel.app/discussions/1402", api: "https://techcg.vercel.app/api/v1/discussions/1402" } } },
  },

  // Directories
  {
    id: "listSources",
    group: "directory",
    method: "GET",
    path: "/sources",
    summary: "Sources",
    description: "Les sites que Tech.cg lit, avec leur nombre d'articles.",
    auth: "none",
    response: { data: [{ id: 3, name: "ADIAC", domain: "adiac-congo.com", homepage: "https://www.adiac-congo.com", country: "Congo", description: "L'actualité du Congo…", logoUrl: "https://…/apple-touch-icon.png", articles: 48 }] },
  },
  {
    id: "listProfiles",
    group: "directory",
    method: "GET",
    path: "/profiles",
    summary: "Profiles.CG",
    description: "Les talents congolais de la tech, de A à Z.",
    auth: "none",
    params: [
      { name: "q", in: "query", type: "string", description: "Nom, rôle, organisation ou ville." },
      { name: "letter", in: "query", type: "string", description: "Initiale (A à Z)." },
    ],
    response: { data: [{ slug: "jane-doe", name: "Jane Doe", role: "Fondatrice", organization: "Exemple", city: "Brazzaville", country: "Congo-Brazzaville", photoUrl: null, links: { web: "https://techcg.vercel.app/profils/jane-doe", api: "https://techcg.vercel.app/api/v1/profiles/jane-doe" } }] },
  },
  {
    id: "getProfile",
    group: "directory",
    method: "GET",
    path: "/profiles/{slug}",
    summary: "Un profil",
    auth: "none",
    params: [{ name: "slug", in: "path", type: "string", description: "Identifiant du profil (dans son adresse).", required: true, example: "jane-doe" }],
    response: { data: { slug: "jane-doe", name: "Jane Doe", role: "Fondatrice", bio: "…", website: null, linkedin: null, twitter: null } },
  },
  {
    id: "listTopics",
    group: "directory",
    method: "GET",
    path: "/topics",
    summary: "Sujets, régions et catégories",
    auth: "none",
    response: { data: { topics: [{ slug: "tech", name: "Tech" }], regions: [{ slug: "congo", name: "Congo" }], categories: [] } },
  },
  {
    id: "getUser",
    group: "directory",
    method: "GET",
    path: "/users/{username}",
    summary: "Un membre",
    description: "Son profil public. Ses publications : GET /stories?author={username}&scope=all.",
    auth: "none",
    params: [{ name: "username", in: "path", type: "string", description: "Nom d'utilisateur.", required: true, example: "rajil_vembe" }],
    response: { data: { username: "rajil_vembe", avatarUrl: author.avatarUrl, about: null, karma: 12, stories: 3, comments: 3, createdAt: "2026-09-20T10:00:00.000Z" } },
  },

  // Account
  {
    id: "me",
    group: "account",
    method: "GET",
    path: "/me",
    summary: "Qui suis-je",
    description: "Le membre de la clé : pratique pour vérifier qu'une clé fonctionne.",
    auth: "required",
    response: { data: { username: "rajil_vembe", avatarUrl: author.avatarUrl, karma: 12, isAdmin: false, createdAt: "2026-09-20T10:00:00.000Z", authenticatedWith: "api_key" } },
  },
];

export const ERROR_CODES = [
  { code: "bad_request", status: 400, meaning: "Corps de requête illisible (JSON attendu)." },
  { code: "unauthorized", status: 401, meaning: "Clé absente, invalide ou révoquée." },
  { code: "forbidden", status: 403, meaning: "Action non permise (pas l'auteur, publications fermées, compte trop récent pour voter)." },
  { code: "not_found", status: 404, meaning: "Publication, profil ou membre introuvable." },
  { code: "validation", status: 422, meaning: "Paramètre ou champ invalide (details.field indique lequel)." },
  { code: "rate_limited", status: 429, meaning: "Trop de requêtes : attendez Retry-After secondes." },
  { code: "internal", status: 500, meaning: "Erreur de notre côté." },
] as const;

/** OpenAPI 3.1 description, for Postman, Insomnia or a client generator. */
export function openApi(origin: string) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const e of ENDPOINTS) {
    const operation: Record<string, unknown> = {
      operationId: e.id,
      tags: [GROUPS.find((g) => g.id === e.group)?.name ?? e.group],
      summary: e.summary,
      ...(e.description ? { description: e.description } : {}),
      ...(e.auth === "required" ? { security: [{ apiKey: [] }] } : e.auth === "optional" ? { security: [{}, { apiKey: [] }] } : {}),
      parameters: (e.params ?? []).map((p) => ({
        name: p.name,
        in: p.in,
        required: p.in === "path" || !!p.required,
        description: p.description,
        schema: { type: p.type, ...(p.enum ? { enum: p.enum } : {}) },
        ...(p.example !== undefined ? { example: p.example } : {}),
      })),
      ...(e.body
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: e.body.filter((f) => f.required).map((f) => f.name),
                    properties: Object.fromEntries(
                      e.body.map((f) => [f.name, f.type === "string[]" ? { type: "array", items: { type: "string" }, description: f.description } : { type: f.type, description: f.description }])
                    ),
                  },
                  ...(e.example ? { example: e.example } : {}),
                },
              },
            },
          }
        : {}),
      responses: {
        [String(e.status ?? 200)]: { description: "OK", content: { "application/json": { example: e.response } } },
        default: { description: "Erreur", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    };
    const path = e.path.replace(/\{(\w+)\}/g, "{$1}");
    paths[path] = { ...(paths[path] ?? {}), [e.method.toLowerCase()]: operation };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "API Tech.cg",
      version: "1.0.0",
      description: `L'actualité tech du Congo et d'Afrique centrale, en JSON. Documentation : ${origin}/api`,
    },
    servers: [{ url: `${origin}/api/v1` }],
    tags: GROUPS.map((g) => ({ name: g.name, description: g.description })),
    components: {
      securitySchemes: { apiKey: { type: "http", scheme: "bearer", description: "Clé personnelle (tcg_…), créée dans Mon espace › API." } },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", enum: ERROR_CODES.map((c) => c.code) },
                message: { type: "string" },
                details: { type: "object" },
              },
            },
          },
        },
      },
    },
    paths,
  };
}
