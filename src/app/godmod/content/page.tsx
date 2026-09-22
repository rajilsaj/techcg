import { prisma } from "@/lib/db";
import { ContentActions } from "@/components/admin/ContentActions";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const [flaggedItems, deletedItems] = await Promise.all([
    prisma.item.findMany({
      where: { flagCount: { gt: 0 }, deleted: false },
      orderBy: { flagCount: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        url: true,
        text: true,
        type: true,
        flagCount: true,
        author: { select: { username: true } },
        createdAt: true,
      },
    }),
    prisma.item.findMany({
      where: { deleted: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        type: true,
        author: { select: { username: true } },
        updatedAt: true,
      },
    }),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Modération du contenu</h1>

      {/* Flagged Items */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contenu signalé ({flaggedItems.length})</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {flaggedItems.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Aucun contenu signalé</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {flaggedItems.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.title || item.text?.slice(0, 100)}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.type} par {item.author.username}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      {item.flagCount} {item.flagCount > 1 ? "signalements" : "signalement"}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <ContentActions itemId={item.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deleted Items */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Supprimés récemment ({deletedItems.length})</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {deletedItems.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Aucun élément supprimé</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {deletedItems.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.type} par {item.author.username}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(item.updatedAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
