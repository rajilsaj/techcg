import { prisma } from "@/lib/db";
import { UserActions } from "@/components/admin/UserActions";
import { getLocale, getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      karma: true,
      shadowBanned: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("admin.users.heading")}</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("admin.users.username")}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("admin.users.karma")}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("admin.users.stories")}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("admin.users.status")}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("admin.users.joined")}</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">{t("admin.users.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.username}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.karma}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user._count.items}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    {user.isAdmin && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {t("admin.users.badgeAdmin")}
                      </span>
                    )}
                    {user.shadowBanned && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {t("admin.users.badgeShadowBanned")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString(locale)}
                </td>
                <td className="px-6 py-4 text-right">
                  <UserActions userId={user.id} isShadowBanned={user.shadowBanned} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
