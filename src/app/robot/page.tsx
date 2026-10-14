import type { Metadata } from "next";
import Link from "next/link";
import { BOT_NAME } from "@/lib/link-preview";
import { IMPORT_INTERVAL_MINUTES } from "@/lib/importer/schedule";

export const metadata: Metadata = {
  title: `${BOT_NAME}, le robot de Tech.cg`,
  description: "Ce que lit le robot de Tech.cg, à quel rythme, et comment le bloquer.",
};

const h2 = "mt-10 text-xl font-bold text-text";
const p = "mt-3 leading-relaxed text-text-secondary";

/** Linked from the robot's user agent: who reads the site, what it takes, how to opt out. */
export default function RobotPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold text-accent">Pour les éditeurs de sites</p>
      <h1 className="mt-1 text-3xl font-bold text-text sm:text-4xl">{BOT_NAME}, le robot de Tech.cg</h1>
      <p className={p}>
        Tech.cg est un agrégateur communautaire de l&apos;actualité tech, startups et entrepreneuriat en Afrique centrale. Notre robot
        lit les flux RSS et les pages d&apos;accueil des sites que nous suivons, et renvoie nos lecteurs vers l&apos;article d&apos;origine.
      </p>

      <h2 className={h2}>Ce qu&apos;il reprend</h2>
      <ul className={`${p} list-disc space-y-1.5 pl-5`}>
        <li>Le titre de l&apos;article, son image principale et un court extrait (quelques phrases).</li>
        <li>Jamais le texte complet : chaque publication renvoie vers votre site, avec son nom de domaine affiché.</li>
        <li>Votre site apparaît sur la page <Link href="/sources" className="text-accent hover:underline">Sources</Link>.</li>
      </ul>

      <h2 className={h2}>À quel rythme</h2>
      <ul className={`${p} list-disc space-y-1.5 pl-5`}>
        <li>Chaque site est relu au plus toutes les {IMPORT_INTERVAL_MINUTES} minutes.</li>
        <li>Au plus une requête toutes les demi-secondes vers un même site, et quelques dizaines par passage.</li>
        <li>Un flux inchangé n&apos;est pas retéléchargé (en-têtes ETag et Last-Modified respectés).</li>
        <li>Il s&apos;annonce toujours comme <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-sm">{BOT_NAME}</code> et ne se fait jamais passer pour un navigateur ordinaire.</li>
      </ul>

      <h2 className={h2}>Le bloquer ou le limiter</h2>
      <p className={p}>Notre robot respecte votre fichier robots.txt. Pour qu&apos;il ne lise plus rien sur votre site :</p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-bg-secondary p-4 text-sm text-text">
        {`User-agent: ${BOT_NAME}\nDisallow: /`}
      </pre>
      <p className={p}>Pour lui interdire seulement une partie du site :</p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-bg-secondary p-4 text-sm text-text">
        {`User-agent: ${BOT_NAME}\nDisallow: /espace-membres/`}
      </pre>
      <p className={p}>
        La règle est prise en compte dans les 6 heures. Un site qui refuse les robots (erreur 403) n&apos;est pas contourné.
      </p>
    </main>
  );
}
