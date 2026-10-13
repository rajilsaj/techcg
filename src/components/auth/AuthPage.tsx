import { prisma } from "@/lib/db";
import { publiclyVisible } from "@/lib/content-status";
import { Header } from "@/components/layout/Header";
import { AuthStage, type StageImage } from "./AuthStage";

/** Covers of two current top stories for the cluster; never blocks sign-in if the database is slow or down. */
async function stageImages(): Promise<StageImage[]> {
  try {
    const rows = await prisma.item.findMany({
      where: { type: "story", ...publiclyVisible(), imageUrl: { startsWith: "https://" } },
      orderBy: [{ rankScore: "desc" }, { id: "desc" }],
      take: 2,
      select: { id: true, imageUrl: true },
    });
    return rows.map((row) => ({ id: row.id, imageUrl: row.imageUrl! }));
  } catch {
    return [];
  }
}

/** Today in Central Africa, e.g. { weekday: "LUN", day: "13" }. */
function today() {
  const now = new Date();
  const zone = { timeZone: "Africa/Kinshasa" } as const;
  return {
    weekday: now.toLocaleDateString("fr-FR", { ...zone, weekday: "short" }).replace(".", "").slice(0, 3).toUpperCase(),
    day: now.toLocaleDateString("fr-FR", { ...zone, day: "numeric" }),
  };
}

/** Sign-in / sign-up page (iCloud-style stage, Google only). */
export async function AuthPage({ intent, next }: { intent: "signin" | "signup"; next: string | null }) {
  const images = await stageImages();
  return (
    <>
      <Header />
      <AuthStage intent={intent} next={next} images={images} {...today()} />
    </>
  );
}
