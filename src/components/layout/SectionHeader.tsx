import Link from "next/link";
import { t } from "@/i18n";

export interface SectionHeaderProps {
  title: string;
  showSubmit?: boolean;
}

export function SectionHeader({ title, showSubmit = true }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-4 pt-8 sm:pt-10">
      <h1 className="text-3xl font-medium text-text">{title}</h1>
      {showSubmit && (
        <Link
          href="/publier"
          className="shrink-0 rounded-full border border-accent px-4 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white"
        >
          {t("section.submit")}
        </Link>
      )}
    </div>
  );
}
