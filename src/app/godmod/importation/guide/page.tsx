import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { IMPORT_INTERVAL_MINUTES } from "@/lib/importer/schedule";
import { FAILING_AFTER } from "@/lib/importer/run";
import { BOT_NAME } from "@/lib/link-preview";
import { AdminHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "principe", title: "Comment fonctionne l'importation" },
  { id: "ajouter", title: "Ajouter une source pas à pas" },
  { id: "adresse", title: "Choisir la bonne adresse" },
  { id: "filtrer", title: "L'option « Filtrer »" },
  { id: "navigateur", title: "L'option « Navigateur »" },
  { id: "google-news", title: "Sites qui bloquent les robots : Google News" },
  { id: "fiche", title: "La fiche publique (page Sources)" },
  { id: "rythme", title: "Rythme et importation automatique" },
  { id: "robot", title: "Un robot poli" },
  { id: "doublons", title: "Doublons" },
  { id: "pannes", title: "Messages et pannes : que faire ?" },
] as const;

const h2 = "scroll-mt-20 text-lg font-bold text-text";
const p = "mt-2 text-sm leading-relaxed text-text-secondary";
const ul = "mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-secondary";
const code = "rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-text";
const strong = "font-semibold text-text";

/** Admin › Importation › Guide: everything needed to set up the importer by hand. */
export default async function ImportGuidePage() {
  await requireAdminPage("/godmod/importation/guide");

  const messages: [string, string][] = [
    ["« N article(s) trouvé(s), aucun nouveau »", "Normal : la source a été lue, tout est déjà sur le site."],
    ["« Aucun changement depuis la dernière lecture »", "Normal : le site indique que son flux n'a pas changé, rien n'a été téléchargé."],
    ["« N doublon(s) écarté(s) »", "Normal : ces articles sont déjà publiés (même adresse ou même titre). Voir Doublons."],
    ["« N hors sujet écarté(s) »", "L'option Filtrer a écarté des articles sans lien avec la tech. Décochez-la si la source est 100 % tech."],
    ["« 0 article(s) trouvé(s) via la page d'accueil »", "La page ne contient pas de liens d'articles lisibles. Essayez dans l'ordre : l'adresse du flux RSS, la page « Actualités » du site, puis l'option Navigateur."],
    ["« le site refuse l'accès aux robots (403) »", "Le site bloque les robots. Il n'est pas contourné : passez par Google News (voir plus haut) ou demandez l'accès à l'éditeur."],
    ["« le site interdit l'accès à notre robot (robots.txt) »", "Le site a choisi de ne pas être lu. Même solution : Google News, ou demander l'accès."],
    ["« site ou page introuvable (404) »", "L'adresse a changé (nouveau site, flux déplacé). Ouvrez le site, trouvez la nouvelle adresse et modifiez la source."],
    ["« le site ne répond pas » / « connexion impossible » / « erreur (5xx) »", "Déjà réessayé 3 fois automatiquement. Souvent passager. Si la source passe « En panne », désactivez-la quelques jours."],
    ["« clé SerpApi manquante »", "Ajoutez la clé SerpApi dans Intégrations (sources Google News uniquement)."],
    ["« le navigateur n'a pas pu démarrer »", "Relancez « Importer maintenant ». Si cela persiste, décochez Navigateur pour cette source."],
    ["« Importation déjà en cours pour cette source »", "Une autre importation de la même source tourne déjà (automatique ou un autre clic). Attendez une minute."],
  ];

  return (
    <>
      <AdminHeader
        title="Guide de configuration de l'importation"
        description="Tout ce qu'il faut savoir pour ajouter et régler les sources à la main : quelle adresse donner, quelles options cocher, et que faire quand une source ne marche plus."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Sommaire" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Sommaire</p>
          <ol className="space-y-1 text-sm">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-text hover:text-accent">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
          <Link href="/godmod/importation" className="mt-4 inline-block text-sm text-accent hover:underline">
            ← Retour à Importation
          </Link>
        </nav>

        <div className="min-w-0 max-w-3xl space-y-8 rounded-xl border border-border bg-bg p-5 sm:p-8">
          <section>
            <h2 id="principe" className={h2}>1. Comment fonctionne l&apos;importation</h2>
            <p className={p}>Pour chaque source, l&apos;outil essaie dans cet ordre :</p>
            <ol className={`${ul} list-decimal`}>
              <li><span className={strong}>Le flux RSS/Atom</span> : si l&apos;adresse donnée est un flux, ou si la page en annonce un. C&apos;est le plus fiable et le plus rapide.</li>
              <li><span className={strong}>La page</span> : sans flux, il lit la page, repère les liens qui ressemblent à des titres d&apos;articles (y compris les boutons « Lire l&apos;article » sous un titre), puis ouvre chaque article.</li>
              <li><span className={strong}>Google News</span> : pour les sources dont l&apos;adresse est une recherche Google News (sujets d&apos;Intégrations, ou sites qui bloquent les robots).</li>
            </ol>
            <p className={p}>
              Chaque nouvel article est ensuite lu en entier : titre, résumé, mots-clés, langue, temps de lecture et image mesurée. Le titre et l&apos;extrait sont
              traduits en français si besoin, et les sujets (Congo, Afrique, Startups, Tech…) sont détectés. L&apos;article est publié sous un compte au nom de la
              source et renvoie toujours vers l&apos;article d&apos;origine. Seuls le titre, l&apos;image et un court extrait sont repris, jamais le texte complet.
            </p>
          </section>

          <section>
            <h2 id="ajouter" className={h2}>2. Ajouter une source pas à pas</h2>
            <ol className={`${ul} list-decimal`}>
              <li>Ouvrez <Link href="/godmod/importation" className="text-accent hover:underline">Importation</Link>, carte « Ajouter une source ».</li>
              <li><span className={strong}>Nom</span> : le nom du média, suivi du pays entre parenthèses si utile, par ex. <code className={code}>Vox.cg (Congo)</code>. Il sert aussi à créer le compte qui publie ses articles.</li>
              <li><span className={strong}>Adresse</span> : le flux RSS si vous le connaissez, sinon la page d&apos;accueil ou la page « Actualités » (voir la section suivante).</li>
              <li><span className={strong}>Articles max par import</span> : 10 suffit pour un site qui publie quelques articles par jour ; 20 pour un gros site. Seuls les nouveaux sont ajoutés.</li>
              <li><span className={strong}>Catégorie</span> : facultatif, appliquée à tous ses articles.</li>
              <li><span className={strong}>Filtrer</span> : cochez pour un site d&apos;actualité générale, décochez pour un site 100 % tech.</li>
              <li><span className={strong}>Navigateur</span> : laissez décoché au départ.</li>
              <li>Cliquez « Ajouter la source », puis « Importer maintenant » sur sa ligne, et lisez le résultat dans la colonne « Dernière importation ».</li>
            </ol>
            <p className={p}>
              Après l&apos;ajout, « Modifier » permet de changer tous ces réglages, de compléter la fiche publique, de désactiver la source (décocher « Active »)
              ou de la supprimer. Les articles déjà importés restent dans tous les cas.
            </p>
          </section>

          <section>
            <h2 id="adresse" className={h2}>3. Choisir la bonne adresse</h2>
            <ul className={ul}>
              <li><span className={strong}>Site WordPress</span> (la grande majorité) : le flux est à <code className={code}>https://site.com/feed/</code>. Essayez-le en premier.</li>
              <li><span className={strong}>Autres flux courants</span> : <code className={code}>/rss</code>, <code className={code}>/rss.xml</code>, <code className={code}>/feed.xml</code>, <code className={code}>/atom.xml</code>. Une adresse de flux ouverte dans le navigateur affiche du XML.</li>
              <li><span className={strong}>Trouver le flux d&apos;une page</span> : clic droit › « Afficher le code source », cherchez <code className={code}>rss+xml</code>. En général la page d&apos;accueil suffit : l&apos;outil trouve ce flux tout seul.</li>
              <li><span className={strong}>Vérifiez que le flux est le bon</span> : certains sites ont un flux d&apos;une autre édition (ITWeb Africa renvoie vers ITWeb Afrique du Sud). Dans ce cas, donnez la page d&apos;accueil.</li>
              <li><span className={strong}>Pour une rubrique</span> : donnez le flux ou la page de la rubrique (par ex. <code className={code}>https://site.com/category/tech/feed/</code>), utile pour un média généraliste.</li>
              <li><span className={strong}>Pas de flux</span> : donnez la page qui liste les derniers articles (souvent « Actualités » ou « News »), plutôt que la page d&apos;accueil.</li>
            </ul>
          </section>

          <section>
            <h2 id="filtrer" className={h2}>4. L&apos;option « Filtrer »</h2>
            <p className={p}>
              Avec Filtrer, seuls les articles qui parlent clairement de startups, d&apos;entrepreneuriat ou de tech sont importés : le titre, le résumé et les
              mots-clés sont vérifiés avant de lire l&apos;article, puis le texte de l&apos;article confirme le sujet. Les autres sont comptés « hors sujet écarté ».
            </p>
            <ul className={ul}>
              <li>À cocher pour un média généraliste (Adiac, Actualite.cd, Gabonreview…).</li>
              <li>À décocher pour un site entièrement tech (TechCabal, Developpez.com…), sinon de bons articles peuvent être écartés.</li>
            </ul>
          </section>

          <section>
            <h2 id="navigateur" className={h2}>5. L&apos;option « Navigateur »</h2>
            <p className={p}>
              Certains sites sont construits en JavaScript : le code envoyé par le serveur ne contient aucun article, ils n&apos;apparaissent qu&apos;une fois la page
              exécutée par un navigateur. Le signe : « 0 article trouvé via la page d&apos;accueil » alors que le site affiche bien des articles (exemple : ARPCE).
            </p>
            <ul className={ul}>
              <li>Avec Navigateur, la page et chaque article sont ouverts dans un vrai navigateur (Chrome sans écran), qui s&apos;annonce comme {BOT_NAME} et ne charge ni images ni polices.</li>
              <li>C&apos;est 5 à 10 fois plus lent : ne l&apos;activez que si nécessaire, et gardez « Articles max » bas (5 à 10).</li>
              <li>Le Navigateur ne sert pas à passer un blocage : un site qui refuse les robots les refuse aussi en navigateur.</li>
            </ul>
          </section>

          <section>
            <h2 id="google-news" className={h2}>6. Sites qui bloquent les robots : Google News</h2>
            <p className={p}>
              Quand un site refuse les robots (erreur 403) ou les interdit dans son robots.txt, l&apos;outil ne le contourne pas. On peut en revanche récupérer ses
              articles tels que Google News les référence, ce que l&apos;éditeur a accepté. C&apos;est ainsi que sont suivis Techpoint Africa et Ver Angola.
            </p>
            <ol className={`${ul} list-decimal`}>
              <li>Vérifiez que la clé SerpApi est configurée dans <Link href="/godmod/integrations" className="text-accent hover:underline">Intégrations</Link>.</li>
              <li>Dans Importation › Ajouter une source, donnez comme adresse une recherche Google News limitée au site :
                <pre className="mt-2 overflow-x-auto rounded-lg bg-bg-secondary p-3 font-mono text-xs text-text">https://serpapi.com/search?engine=google_news&amp;q=site:techpoint.africa+when:7d&amp;gl=ng&amp;hl=en</pre>
                Remplacez le domaine après <code className={code}>site:</code>, <code className={code}>gl</code> (pays : cg, cd, cm, ng, ao…) et <code className={code}>hl</code> (langue : fr, en, pt). Ne collez jamais votre clé dans l&apos;adresse : si elle y est, elle est retirée.
              </li>
              <li>Désactivez l&apos;ancienne source directe qui échouait.</li>
            </ol>
            <p className={p}>
              Ces recherches sont relues toutes les 6 heures et consomment chacune environ 120 recherches SerpApi par mois. Elles n&apos;apparaissent pas dans les
              « sujets » d&apos;Intégrations, qui ne les modifient ni ne les suppriment. L&apos;autre solution reste d&apos;écrire à l&apos;éditeur pour lui demander
              d&apos;autoriser {BOT_NAME} ou de vous donner l&apos;adresse de son flux.
            </p>
          </section>

          <section>
            <h2 id="fiche" className={h2}>7. La fiche publique (page Sources)</h2>
            <p className={p}>
              Chaque source active (hors Google News) a une carte sur la page <Link href="/sources" className="text-accent hover:underline">Sources</Link> : nom affiché,
              pays, logo et description, lus automatiquement sur le site. Pour les corriger : « Modifier » › « Fiche publique ». Un champ laissé vide est rempli à
              nouveau depuis le site.
            </p>
          </section>

          <section>
            <h2 id="rythme" className={h2}>8. Rythme et importation automatique</h2>
            <ul className={ul}>
              <li>Chaque source active est relue toutes les {IMPORT_INTERVAL_MINUTES} minutes, les recherches Google News toutes les 6 heures, sans action de votre part.</li>
              <li>Les relectures sont déclenchées par les visites du site, et une tâche planifiée prend le relais les jours calmes. L&apos;encadré « Importation automatique » indique le dernier passage.</li>
              <li>Les sources « Navigateur » ne sont relues que par la tâche planifiée et par « Importer maintenant » (pour ne pas ralentir le site).</li>
              <li>« Importer maintenant » relit une source tout de suite ; « Tout importer maintenant », toutes les sources actives (jusqu&apos;à quelques minutes).</li>
              <li>Une seule importation d&apos;une même source à la fois : un clic pendant un passage automatique est sans effet (« Importation déjà en cours »).</li>
            </ul>
          </section>

          <section>
            <h2 id="robot" className={h2}>9. Un robot poli</h2>
            <p className={p}>Pour rester le bienvenu chez les éditeurs, l&apos;outil :</p>
            <ul className={ul}>
              <li>s&apos;annonce toujours comme <code className={code}>{BOT_NAME}</code>, avec un lien vers <Link href="/robot" className="text-accent hover:underline">une page qui l&apos;explique</Link> aux éditeurs ;</li>
              <li>respecte le robots.txt de chaque site (relu toutes les 6 heures) ;</li>
              <li>espace ses requêtes : au plus une toutes les demi-secondes vers un même site ;</li>
              <li>ne retélécharge pas un flux inchangé (le site répond « pas de changement ») ;</li>
              <li>réessaie 2 fois (après 2 puis 5 secondes) quand un site met trop de temps ou renvoie une erreur passagère, mais jamais quand il refuse l&apos;accès.</li>
            </ul>
          </section>

          <section>
            <h2 id="doublons" className={h2}>10. Doublons</h2>
            <p className={p}>Un article n&apos;est pas importé s&apos;il est déjà sur le site :</p>
            <ul className={ul}>
              <li><span className={strong}>même adresse</span>, même avec des variantes (http/https, www, <code className={code}>/index.php/</code>, <code className={code}>/amp</code>, paramètres <code className={code}>utm_…</code>) — à vie, y compris s&apos;il a été mis à la corbeille ;</li>
              <li><span className={strong}>même titre</span> (ou presque : 85 % des mots en commun) publié dans les 14 derniers jours, par exemple un communiqué repris par plusieurs sites ou un article publié deux fois par le même site.</li>
            </ul>
            <p className={p}>
              Un membre qui partage un lien déjà publié vote pour la publication existante au lieu d&apos;en créer une nouvelle. Pour nettoyer les doublons déjà
              publiés, ouvrez <Link href="/godmod/articles/doublons" className="text-accent hover:underline">Articles › Doublons</Link>.
            </p>
          </section>

          <section>
            <h2 id="pannes" className={h2}>11. Messages et pannes : que faire ?</h2>
            <p className={p}>
              Après {FAILING_AFTER} échecs de suite, une source est marquée <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">En panne</span>{" "}
              et une alerte apparaît en haut d&apos;Importation et du tableau de bord. Une importation réussie efface l&apos;alerte. Le résultat de chaque importation
              s&apos;affiche dans la colonne « Dernière importation » :
            </p>
            <dl className="mt-3 divide-y divide-border rounded-lg border border-border text-sm">
              {messages.map(([message, todo]) => (
                <div key={message} className="grid gap-1 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                  <dt className="font-medium text-text">{message}</dt>
                  <dd className="text-text-secondary">{todo}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
