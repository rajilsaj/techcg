"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

function Spinner() {
  return <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
};

/** Full-width outlined button (used for "Continuer avec Google"). */
export function SecondaryButton({ loading, loadingLabel, icon, children, className = "", disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-bg px-4 py-3 text-[15px] font-medium text-text transition-all hover:border-text-secondary/50 hover:bg-bg-secondary active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100 ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
}
