import { prisma } from "@/lib/db";
import { getLocale, getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const [totalUsers, totalItems, totalComments, recentItems] = await Promise.all([
    prisma.user.count(),
    prisma.item.count({ where: { type: "story" } }),
    prisma.item.count({ where: { type: "comment" } }),
    prisma.item.findMany({
      where: { type: "story", deleted: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        author: { select: { username: true } },
        points: true,
        commentCount: true,
        createdAt: true,
      },
    }),
  ]);

  const shadowBannedUsers = await prisma.user.count({ where: { shadowBanned: true } });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("admin.dashboard.heading")}</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label={t("admin.stats.users")} value={totalUsers} />
        <StatCard label={t("admin.stats.stories")} value={totalItems} />
        <StatCard label={t("admin.stats.comments")} value={totalComments} />
        <StatCard label={t("admin.stats.shadowBanned")} value={shadowBannedUsers} />
      </div>

      {/* Recent Items */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t("admin.dashboard.recent")}</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentItems.map((item) => (
            <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("admin.dashboard.itemMeta", {
                      author: item.author.username,
                      points: item.points,
                      comments: item.commentCount,
                    })}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <p className="text-gray-500 text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}
