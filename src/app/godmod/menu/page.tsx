import Link from "next/link";
import { Eye, EyeOff, Lock } from "lucide-react";
import { requireAdminPage } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { MENU_ITEMS } from "@/lib/menu";
import { t } from "@/i18n";
import { SubmitButton } from "@/components/admin/FormControls";
import { AdminHeader, AdminNotice, Card, primaryButtonClass } from "@/components/admin/ui";
import { saveMenuAction } from "./actions";

export const dynamic = "force-dynamic";

const row = "flex items-center gap-3 py-3";

export default async function MenuAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminPage("/godmod/menu");
  const { notice } = await searchParams;
  const { visibleMenus } = await getSettings();

  return (
    <>
      <AdminHeader
        title="Menu"
        description="Choisissez les rubriques affichées dans le menu principal (en-tête sur ordinateur, barre du bas sur téléphone). Une rubrique masquée reste accessible par son adresse."
      />
      <AdminNotice notice={notice} />

      <form action={saveMenuAction} className="max-w-2xl space-y-4">
        <Card title="Rubriques du menu">
          <ul className="divide-y divide-border">
            <li className={row}>
              <Lock size={16} className="text-text-secondary" aria-hidden />
              <span className="flex-1 text-sm font-medium text-text">{t("nav.top")}</span>
              <span className="text-xs text-text-secondary">Toujours affichée</span>
            </li>
            {MENU_ITEMS.map((m) => (
              <li key={m.id}>
                <label className={`${row} group cursor-pointer`}>
                  <input type="checkbox" name="menu" value={m.id} defaultChecked={visibleMenus.includes(m.id)} className="peer sr-only" />
                  <Eye size={16} className="hidden text-accent peer-checked:block" aria-hidden />
                  <EyeOff size={16} className="text-text-secondary peer-checked:hidden" aria-hidden />
                  <span className="flex-1 text-sm text-text">
                    <span className="font-medium">{t(m.label)}</span>
                    <Link href={m.href} target="_blank" className="ml-2 text-xs text-text-secondary hover:text-accent">
                      {m.href}
                    </Link>
                  </span>
                  {/* Switch */}
                  <span className="relative h-6 w-11 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
                  <span className="w-14 text-right text-xs text-text-secondary peer-checked:hidden">Masquée</span>
                  <span className="hidden w-14 text-right text-xs font-medium text-accent peer-checked:inline">Affichée</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
        <SubmitButton className={primaryButtonClass}>Enregistrer le menu</SubmitButton>
      </form>
    </>
  );
}
