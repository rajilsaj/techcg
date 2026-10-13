"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { t } from "@/i18n";

/** Chrome/Edge/Samsung's install event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-dismissed";

/**
 * "Install the app" strip above the phone tab bar. Android: one tap opens the
 * browser's install dialog. iPhone/iPad Safari: explains Share → "Sur l'écran
 * d'accueil". Hidden once installed or dismissed.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {}
    if (standalone || dismissed) return;

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    // Only Safari can add to the home screen on older iOS versions.
    if (isIos && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) {
      setIos(true);
      setHidden(false);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || (!deferred && !ios)) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setHidden(true);
  };

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-xs text-text">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-white">T</span>
      <p className="min-w-0 flex-1 leading-snug">
        <span className="font-semibold">{t("pwa.title")}</span>
        <br />
        <span className="text-text-secondary">
          {ios ? (
            <>
              {t("pwa.iosBefore")} <Share size={12} className="inline align-[-2px]" aria-label={t("pwa.share")} /> {t("pwa.iosAfter")}
            </>
          ) : (
            t("pwa.body")
          )}
        </span>
      </p>
      {deferred && (
        <button type="button" onClick={install} className="shrink-0 rounded-full bg-accent px-3 py-1.5 font-medium text-white">
          {t("pwa.install")}
        </button>
      )}
      <button type="button" onClick={dismiss} aria-label={t("pwa.dismiss")} className="shrink-0 rounded-full p-1 text-text-secondary hover:text-text">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
