import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { TermsScreen } from "@/components/admin/TermsScreen";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function TagsAdminPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/etiquettes");
  const { notice } = await searchParams;
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { items: true } } },
  });

  return (
    <TermsScreen
      kind="tag"
      title="Étiquettes"
      description="Créées par les membres quand ils publient (5 au maximum par article). Renommez-les ou supprimez-les ici."
      publicPath="/etiquette"
      notice={notice}
      terms={tags.map((tag) => ({ ...tag, count: tag._count.items }))}
    />
  );
}
