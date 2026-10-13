"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/api/actions/auth";
import { t } from "@/i18n";
import { clearOfflinePages } from "@/components/pwa/ServiceWorker";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  const logout = () =>
    startTransition(async () => {
      // Phone/Google logins also keep a Firebase session in the browser; drop it too.
      try {
        const { firebaseSignOut } = await import("@/lib/firebase-auth");
        await firebaseSignOut();
      } catch {
        // Not signed in through Firebase, or Firebase isn't configured.
      }
      await clearOfflinePages();
      await logoutAction();
    });

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="text-text-secondary hover:text-accent transition-colors disabled:opacity-60"
    >
      {t("nav.logout")}
    </button>
  );
}
