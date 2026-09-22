import { SITE } from "@/lib/site";
import { getT } from "@/i18n/server";

export default async function SettingsPage() {
  const t = await getT();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("admin.settings.heading")}</h1>

      <div className="max-w-2xl space-y-8">
        {/* Site Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("admin.settings.site")}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">{t("admin.settings.siteName")}</label>
              <input
                type="text"
                defaultValue={SITE.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">{t("admin.settings.siteDescription")}</label>
              <textarea
                defaultValue={t("admin.settings.siteDescriptionDefault")}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Moderation Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("admin.settings.moderation")}</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t("admin.settings.requireApproval")}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t("admin.settings.enableFlagging")}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t("admin.settings.autoHide")}</span>
            </label>
          </div>
        </div>

        {/* Authentication */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("admin.settings.auth")}</h2>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-900">{t("admin.settings.authNote")}</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">{t("admin.settings.danger")}</h2>
          <p className="text-sm text-gray-600 mb-4">{t("admin.settings.dangerNote")}</p>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
            {t("admin.settings.clearAllFlags")}
          </button>
        </div>

        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          {t("admin.settings.save")}
        </button>
      </div>
    </div>
  );
}
