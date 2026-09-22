import Link from "next/link";
import { SITE } from "@/lib/site";
import { getT } from "@/i18n/server";

const NAV = [
  { href: "/godmod", key: "admin.nav.dashboard" },
  { href: "/godmod/users", key: "admin.nav.users" },
  { href: "/godmod/content", key: "admin.nav.moderation" },
  { href: "/godmod/settings", key: "admin.nav.settings" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getT();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">{t("admin.title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("admin.subtitle", { site: SITE.name })}</p>
          </div>

          <nav className="space-y-1 px-4 py-6">
            {NAV.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                {t(key)}
              </Link>
            ))}
          </nav>

          <div className="px-4 py-6 border-t border-gray-200">
            <Link
              href="/"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm"
            >
              {t("admin.backToSite")}
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
