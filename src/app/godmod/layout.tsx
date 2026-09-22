import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
            <p className="text-sm text-gray-500 mt-1">Gestion de Tech.cg</p>
          </div>

          <nav className="space-y-1 px-4 py-6">
            <Link
              href="/godmod"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Tableau de bord
            </Link>
            <Link
              href="/godmod/users"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Utilisateurs
            </Link>
            <Link
              href="/godmod/content"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Modération
            </Link>
            <Link
              href="/godmod/settings"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Paramètres
            </Link>
          </nav>

          <div className="px-4 py-6 border-t border-gray-200">
            <Link
              href="/"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm"
            >
              ← Retour au site
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
