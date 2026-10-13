import { prisma } from "@/lib/db";
import { publiclyVisible } from "@/lib/content-status";
import { Header } from "@/components/layout/Header";
import { AuthShell } from "./AuthShell";
import { AuthShowcase, type ShowcaseData } from "./AuthShowcase";

/** Live numbers and current headlines for the showcase; never blocks sign-in if the database is slow or down. */
async function showcaseData(): Promise<ShowcaseData> {
  try {
    const [members, articles, headlines] = await Promise.all([
      prisma.user.count({ where: { banned: false, NOT: { email: { endsWith: ".invalid" } } } }),
      prisma.item.count({ where: { type: "story", ...publiclyVisible() } }),
      prisma.item.findMany({
        where: { type: "story", ...publiclyVisible(), title: { not: null } },
        orderBy: [{ rankScore: "desc" }, { id: "desc" }],
        take: 3,
        select: { id: true, title: true, url: true, imageUrl: true },
      }),
    ]);
    return { members, articles, headlines: headlines.map((h) => ({ ...h, title: h.title ?? "" })) };
  } catch {
    return { members: 0, articles: 0, headlines: [] };
  }
}

/** Sign-in / sign-up page: branded showcase on one side, the Google card on the other. */
export async function AuthPage({ intent, next }: { intent: "signin" | "signup"; next: string | null }) {
  const data = await showcaseData();
  return (
    <>
      <Header />
      <div className="mx-auto grid max-w-6xl lg:min-h-[calc(100vh-65px)] items-center gap-8 px-4 py-6 sm:py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="order-last lg:order-none">
          <AuthShowcase data={data} />
        </div>
        <div className="flex justify-center lg:justify-start">
          <AuthShell intent={intent} next={next} />
        </div>
      </div>
    </>
  );
}
