import Link from "next/link";
import { getT } from "@/i18n/server";

export interface SectionHeaderProps {
  title: string;
  showSubmit?: boolean;
}

export async function SectionHeader({ title, showSubmit = true }: SectionHeaderProps) {
  const t = await getT();

  return (
    <div className="border-b border-border px-4 py-4 flex items-center justify-between">
      <h1 className="text-lg font-medium text-text">{title}</h1>
      {showSubmit && (
        <Link
          href="/submit"
          className="px-3 py-1.5 border border-accent text-accent rounded hover:bg-accent/10 transition-colors text-sm font-medium"
        >
          {t("section.submit")}
        </Link>
      )}
    </div>
  );
}
