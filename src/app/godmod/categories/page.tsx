import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { TermsScreen } from "@/components/admin/TermsScreen";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CategoriesAdminPage({ searchParams }: PageProps) {
  await requireAdminPage("/godmod/categories");
  const { notice } = await searchParams;
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, description: true, _count: { select: { items: true } } },
  });

  return (
    <TermsScreen
      kind="category"
      title="Catégories"
      description="Les membres choisissent une catégorie en publiant ; chaque catégorie a sa page publique."
      publicPath="/categorie"
      notice={notice}
      terms={categories.map((c) => ({ ...c, count: c._count.items }))}
    />
  );
}
