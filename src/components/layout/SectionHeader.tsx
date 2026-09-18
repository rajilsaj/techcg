import Link from "next/link";

export interface SectionHeaderProps {
  title: string;
  showSubmit?: boolean;
}

export function SectionHeader({ title, showSubmit = true }: SectionHeaderProps) {
  return (
    <div className="border-b border-border px-4 py-4 flex items-center justify-between">
      <h1 className="text-lg font-medium text-text">{title}</h1>
      {showSubmit && (
        <Link
          href="/submit"
          className="px-3 py-1.5 border border-accent text-accent rounded hover:bg-accent/10 transition-colors text-sm font-medium"
        >
          + Submit
        </Link>
      )}
    </div>
  );
}
