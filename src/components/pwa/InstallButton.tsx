"use client";

import { useEffect, useState } from "react";
import { MonitorDown } from "lucide-react";
import { t } from "@/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * « Installer l'application » in the footer on computers (phones get the strip
 * above the tab bar). Shown only when the browser offers installation.
 */
export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }}
      className="hidden items-center gap-1.5 rounded-full bg-bg-secondary px-3 py-1.5 font-medium text-text transition-colors hover:bg-accent/10 hover:text-accent md:inline-flex"
    >
      <MonitorDown size={14} aria-hidden />
      {t("pwa.installDesktop")}
    </button>
  );
}
