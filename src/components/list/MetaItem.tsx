import { LucideIcon } from "lucide-react";

export interface MetaItemProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  className?: string;
}

export function MetaItem({ icon: Icon, label, href, className = "" }: MetaItemProps) {
  const content = (
    <div className={`flex items-center gap-1 text-sm text-text-secondary ${className}`}>
      <Icon size={14} strokeWidth={2} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="hover:text-text transition-colors">
        {content}
      </a>
    );
  }

  return content;
}
