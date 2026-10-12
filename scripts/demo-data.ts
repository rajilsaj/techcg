/**
 * Demo content for trying out the site: fake members and articles.
 *
 *   npm run demo:seed     add 500 fake articles from 25 fake members
 *   npm run demo:remove   delete every fake member, which deletes their articles
 *
 * Fake members are recognised by their email (…@demo.invalid) and can't log in.
 * Articles link to fictitious *.example sites (reserved names that never resolve)
 * and carry their own image and French excerpt, so no preview is ever fetched.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { calculateRankScore } from "../src/lib/ranking";

const prisma = new PrismaClient();

const DEMO_EMAIL_DOMAIN = "@demo.invalid";
const ARTICLE_COUNT = 500;
const DAYS_BACK = 60;

/* ---------- Deterministic randomness, so reruns produce the same data ---------- */

let state = 20261012;
function random(): number {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
}
const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** French contractions: de + le = du, de + les = des; à + le = au, à + les = aux. */
const de = (s: string) => (s.startsWith("le ") ? `du ${s.slice(3)}` : s.startsWith("les ") ? `des ${s.slice(4)}` : `de ${s}`);
const a = (s: string) => (s.startsWith("le ") ? `au ${s.slice(3)}` : s.startsWith("les ") ? `aux ${s.slice(4)}` : `à ${s}`);

/* ---------- Vocabulary (all organisations are fictitious) ---------- */

const FIRST_NAMES = [
  "Mireille", "Grâce", "Christ", "Exaucé", "Merveille", "Prince", "Divine", "Junior", "Patrick", "Aïcha",
  "Fabrice", "Nadège", "Rodrigue", "Ornella", "Hervé", "Sandrine", "Arnaud", "Bénédicte", "Cédric", "Dorcas",
  "Ghislain", "Lydie", "Martial", "Prisca", "Yannick",
];
const LAST_NAMES = [
  "Mabiala", "Nkounkou", "Moukoko", "Bouanga", "Okemba", "Mavoungou", "Ngoma", "Loubaki", "Massamba", "Ibara",
  "Ondongo", "Malonga", "Samba", "Itoua", "Bakala", "Mbemba", "Kimbembe", "Nzaba", "Tchicaya", "Poaty",
  "Ganga", "Moussavou", "Elenga", "Kaya", "Mouanda",
];
const CITIES = ["Brazzaville", "Pointe-Noire", "Kinshasa", "Dolisie", "Ouesso", "Douala", "Libreville", "Yaoundé", "Owando", "Lubumbashi"];
const ORGS = [
  "Mokili Pay", "Lisapo Labs", "Kanda Tech", "Bisso Data", "Ngouma Cloud", "Elonga Mobile", "Nzela Logistics",
  "Kitoko AI", "Mbote Connect", "Loso Agritech", "Zola Health", "Malamu Edu", "Mwinda Energy", "Kobanga Security",
];
const TECHS = [
  "l'intelligence artificielle", "la 5G", "le paiement mobile", "le cloud", "la fibre optique", "les drones agricoles",
  "l'énergie solaire connectée", "la cybersécurité", "l'open data", "le e-commerce", "la santé numérique",
  "l'éducation en ligne", "les objets connectés", "le logiciel libre", "la blockchain",
];
const SECTORS = ["l'agriculture", "la santé", "les transports", "la banque", "l'éducation", "le commerce informel", "la logistique", "l'énergie"];
const SERVICES = [
  "transfert d'argent", "covoiturage", "livraison de repas", "télémédecine", "suivi des récoltes",
  "réservation de taxis-motos", "gestion de tontines", "cours de soutien en ligne", "location de matériel agricole",
];
const LANGUAGES = ["Python", "Rust", "TypeScript", "Go", "Flutter", "Kotlin", "Django", "Next.js", "PostgreSQL", "Docker", "Laravel", "React Native"];
const PROJECTS = [
  "un outil de suivi des bus", "une appli de tontine", "un traducteur lingala-français", "un bot WhatsApp pour les marchés",
  "un tableau de bord météo pour les agriculteurs", "une boutique en ligne pour artisans", "un annuaire des pharmacies de garde",
  "un simulateur de factures d'électricité", "une carte des coupures de courant",
];
const AMOUNTS = ["150 millions de FCFA", "2 millions de dollars", "500 000 euros", "1,2 milliard de FCFA", "300 000 dollars", "80 millions de FCFA"];
const APPS = ["le paiement mobile", "les réseaux sociaux", "les applis de livraison", "les cours en ligne", "les banques en ligne"];
const DOMAINS = [
  "brazzanews.example", "tech-congo.example", "kinshasa-digital.example", "afritech-hebdo.example", "pointe-noire-info.example",
  "startups-cemac.example", "lecodeur.example", "mobile-afrique.example", "data-congo.example", "innov-brazza.example",
];

interface Vars {
  city: string;
  city2: string;
  org: string;
  org2: string;
  tech: string;
  sector: string;
  service: string;
  lang: string;
  project: string;
  amount: string;
  app: string;
  n: number;
  pct: number;
}

/** [title, excerpt] pairs; each excerpt reads like the article's opening lines. */
const TEMPLATES: ((v: Vars) => [string, string])[] = [
  (v) => [
    `${v.org} lève ${v.amount} pour développer ${v.tech} à ${v.city}`,
    `La jeune pousse ${v.org} annonce une levée de ${v.amount}. Les fonds serviront à recruter et à déployer ${v.tech} auprès des entreprises de ${v.city} d'ici la fin de l'année.`,
  ],
  (v) => [
    `${cap(v.tech)} : ce qui change pour les PME de ${v.city}`,
    `Coûts, formation, accès au réseau : nous avons interrogé une dizaine de dirigeants de PME de ${v.city} sur leur passage ${a(v.tech)}. Leurs retours sont plus nuancés qu'on ne le pense.`,
  ],
  (v) => [
    `À ${v.city}, ${v.org} ouvre un incubateur dédié ${a(v.tech)}`,
    `Le nouvel espace accueillera ${v.n} projets par promotion pendant six mois, avec un accompagnement technique et un accès gratuit à des serveurs pour tester ${v.tech}.`,
  ],
  (v) => [
    `Pourquoi ${v.tech} pourrait transformer ${v.sector} au Congo`,
    `Des projets pilotes menés à ${v.city} et à ${v.city2} montrent des gains rapides pour ${v.sector}. Reste à résoudre la question du financement et de la connectivité en zone rurale.`,
  ],
  (v) => [
    `${v.org} recrute ${v.n} développeurs à ${v.city}`,
    `L'entreprise cherche des profils ${v.lang} confirmés comme débutants. Les candidatures sont ouvertes jusqu'à la fin du mois, avec une formation interne de quatre semaines.`,
  ],
  (v) => [
    `Retour d'expérience : migrer vers ${v.lang} avec une équipe de ${v.n} personnes`,
    `Après deux ans sur une base de code vieillissante, notre équipe de ${v.city} a tout réécrit en ${v.lang}. Voici ce qui a marché, ce qui a coincé et ce que nous referions autrement.`,
  ],
  (v) => [
    `Hackathon de ${v.city} : ${v.n} équipes planchent sur ${v.tech}`,
    `Pendant 48 heures, étudiants et professionnels ont prototypé des solutions autour ${de(v.tech)}. Le projet gagnant vise ${v.sector} et sera accompagné par ${v.org}.`,
  ],
  (v) => [
    `${v.org} dévoile une application de ${v.service}`,
    `Disponible d'abord à ${v.city}, l'application s'appuie sur le paiement mobile pour simplifier la vie des usagers. Une extension à ${v.city2} est prévue dans les prochains mois.`,
  ],
  (v) => [
    `Guide : débuter avec ${v.lang} quand on vit à ${v.city}`,
    `Ressources gratuites, communautés locales, astuces pour coder avec une connexion limitée : notre guide pas à pas pour apprendre ${v.lang} sans se ruiner.`,
  ],
  (v) => [
    `Coupures de réseau à ${v.city} : comment les startups s'adaptent`,
    `Mode hors ligne, synchronisation différée, SMS en secours : plusieurs équipes de ${v.city} partagent leurs méthodes pour garder leurs services disponibles malgré les coupures.`,
  ],
  (v) => [
    `${v.org} et ${v.org2} s'associent autour ${de(v.tech)}`,
    `Les deux entreprises mettront en commun leurs équipes techniques pour proposer une offre commune ${de(v.tech)} aux administrations et aux PME de ${v.city}.`,
  ],
  (v) => [
    `Étude : ${v.pct} % des jeunes de ${v.city} utilisent ${v.app} chaque semaine`,
    `Menée auprès de plus de mille personnes de 18 à 30 ans, l'enquête montre une adoption rapide ${de(v.app)}, freinée surtout par le coût des données mobiles.`,
  ],
  (v) => [
    `Show TC : j'ai construit ${v.project} en ${v.n} semaines`,
    `Parti d'un problème rencontré au quotidien à ${v.city}, j'ai développé ${v.project} avec ${v.lang}. Le code est ouvert et je cherche des retours avant la première version publique.`,
  ],
  (v) => [
    `Les femmes de la tech à ${v.city} : ${v.n} portraits inspirants`,
    `Développeuses, fondatrices, chercheuses : elles racontent leur parcours, les obstacles rencontrés et leurs conseils aux jeunes filles qui veulent se lancer dans le numérique.`,
  ],
  (v) => [
    `Une feuille de route nationale pour ${v.tech} en préparation`,
    `Un groupe de travail réunissant entreprises, universités et opérateurs doit rendre ses propositions sur ${v.tech} d'ici six mois. ${v.org} fait partie des participants.`,
  ],
  (v) => [
    `${cap(v.service)} : ${v.org} passe le cap des ${v.n} 000 utilisateurs`,
    `Lancé il y a moins d'un an à ${v.city}, le service de ${v.service} de ${v.org} revendique désormais ${v.n} 000 utilisateurs actifs et prépare son arrivée à ${v.city2}.`,
  ],
];

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

/* ---------- Commands ---------- */

async function seed() {
  const existing = await prisma.user.count({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } });
  if (existing > 0) {
    console.log(`Demo data already present (${existing} fake members). Run "npm run demo:remove" first to start over.`);
    return;
  }

  const now = Date.now();
  const members = await prisma.user.createManyAndReturn({
    data: FIRST_NAMES.map((first, i) => {
      const username = slugify(`${first}_${LAST_NAMES[i]}`).replace(/-/g, "_");
      return {
        username,
        email: `${username}${DEMO_EMAIL_DOMAIN}`,
        about: "Compte de démonstration.",
        karma: int(5, 400),
        createdAt: new Date(now - int(DAYS_BACK, DAYS_BACK + 300) * 86_400_000),
      };
    }),
    select: { id: true },
  });

  const titles = new Set<string>();
  const articles: Prisma.ItemCreateManyInput[] = [];
  while (articles.length < ARTICLE_COUNT) {
    const vars: Vars = {
      city: pick(CITIES),
      city2: pick(CITIES),
      org: pick(ORGS),
      org2: pick(ORGS),
      tech: pick(TECHS),
      sector: pick(SECTORS),
      service: pick(SERVICES),
      lang: pick(LANGUAGES),
      project: pick(PROJECTS),
      amount: pick(AMOUNTS),
      app: pick(APPS),
      n: int(3, 40),
      pct: int(35, 92),
    };
    if (vars.city2 === vars.city || vars.org2 === vars.org) continue;
    const [title, excerpt] = pick(TEMPLATES)(vars);
    if (titles.has(title)) continue;
    titles.add(title);

    // More recent days get more articles; points skew low with a few hits.
    const ageMs = Math.pow(random(), 1.6) * DAYS_BACK * 86_400_000;
    const createdAt = new Date(now - ageMs);
    const points = 1 + Math.floor(Math.pow(random(), 3) * 120);
    const domain = pick(DOMAINS);
    const month = createdAt.toISOString().slice(0, 7).replace("-", "/");
    const index = articles.length;

    articles.push({
      type: "story",
      title,
      url: `https://${domain}/${month}/${slugify(title)}`,
      excerpt,
      excerptLang: "fr",
      // ~1 in 7 articles has no image, like real links without one.
      imageUrl: random() < 0.86 ? `https://picsum.photos/seed/techcg-${index}/800/450` : null,
      previewAt: new Date(now),
      authorId: pick(members).id,
      points,
      rankScore: calculateRankScore(points, createdAt),
      rankedAt: new Date(now),
      createdAt,
    });
  }

  const created = await prisma.item.createManyAndReturn({ data: articles, select: { id: true } });
  // Stories use their zero-padded id as the comment-thread path root.
  await prisma.$executeRaw`
    UPDATE "Item" SET path = lpad(id::text, 6, '0')
    WHERE id = ANY(${created.map((c) => c.id)}::int[])`;

  console.log(`Added ${members.length} fake members and ${created.length} fake articles.`);
}

async function remove() {
  const { count } = await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } });
  console.log(`Removed ${count} fake members and all their articles.`);
}

const command = process.argv[2];
const run = command === "seed" ? seed : command === "remove" ? remove : null;
if (!run) {
  console.error('Usage: demo-data.ts seed | remove');
  process.exit(1);
}
run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
