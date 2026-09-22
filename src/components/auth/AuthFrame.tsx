import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

/** Centered card frame shared by every auth screen. */
export function AuthFrame({
  children,
  footer,
  viewKey,
}: {
  children: ReactNode;
  footer?: ReactNode;
  viewKey?: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-start justify-center px-4 py-10 sm:items-center sm:py-16">
      <div className="w-full max-w-[420px]">
        <div
          key={viewKey}
          className="auth-view rounded-2xl border border-border bg-bg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.18)] sm:p-8"
        >
          <div className="mb-6 flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-base font-bold text-white shadow-sm"
            >
              {SITE.name.charAt(0)}
            </span>
            <span className="text-[15px] font-semibold text-text">{SITE.name}</span>
          </div>
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-text-secondary">{footer}</div>}
      </div>
    </div>
  );
}
