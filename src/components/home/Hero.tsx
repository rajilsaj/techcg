import Link from "next/link";
import { t } from "@/i18n";
import { Astronaut } from "./Astronaut";

/** Front-page headline with the illustration, and the Nouveautés / Archives tabs. */
export function Hero({ active }: { active: "new" | "past" }) {
  const tab = (key: "new" | "past", href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`flex-1 border py-2.5 text-center text-sm font-semibold uppercase tracking-wide transition-colors ${
        active === key
          ? "border-accent bg-accent text-white"
          : "border-text-secondary text-text hover:border-accent hover:text-accent"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <section className="pt-8 sm:pt-12">
      <div className="flex items-center justify-between gap-6">
        <h1 className="max-w-md text-4xl font-medium leading-tight text-text sm:text-5xl">
          {t("hero.title")}
        </h1>
        <Astronaut className="hidden h-44 w-auto shrink-0 text-accent sm:block md:h-52" />
      </div>
      <nav className="mt-8 flex" aria-label={t("hero.tabs")}>
        {tab("new", "/", t("hero.new"))}
        {tab("past", "/archives", t("hero.past"))}
      </nav>
    </section>
  );
}
