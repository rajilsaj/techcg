import { AuthStage } from "./AuthStage";

/** Today in Central Africa, e.g. { weekday: "MAR", day: "13", month: "oct." }. */
function today() {
  const now = new Date();
  const zone = { timeZone: "Africa/Kinshasa" } as const;
  return {
    weekday: now.toLocaleDateString("fr-FR", { ...zone, weekday: "short" }).replace(".", "").slice(0, 3).toUpperCase(),
    day: now.toLocaleDateString("fr-FR", { ...zone, day: "numeric" }),
    month: now.toLocaleDateString("fr-FR", { ...zone, month: "short" }),
  };
}

/** Sign-in / sign-up page: full screen, without the site header or footer (floating cluster, Google only). */
export function AuthPage({ intent, next }: { intent: "signin" | "signup"; next: string | null }) {
  return <AuthStage intent={intent} next={next} {...today()} />;
}
