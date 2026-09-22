"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
};

export function PrimaryButton({
  loading,
  loadingLabel,
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition-all hover:brightness-95 active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100 ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
}

export function SecondaryButton({
  loading,
  loadingLabel,
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
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

export function LinkButton({
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`rounded text-sm font-medium text-accent underline-offset-4 transition-colors hover:underline disabled:no-underline disabled:opacity-60 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
