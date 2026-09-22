"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Tone = "error" | "success" | "info";

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  error: {
    box: "border-red-500/30 bg-red-500/[0.07] text-red-700 dark:text-red-300",
    icon: AlertCircle,
  },
  success: {
    box: "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  info: {
    box: "border-[rgba(255,102,0,0.3)] bg-[rgba(255,102,0,0.07)] text-text",
    icon: Info,
  },
};

export function Alert({
  tone = "info",
  children,
  id,
}: {
  tone?: Tone;
  children: React.ReactNode;
  id?: string;
}) {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`auth-view flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-snug ${box}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
