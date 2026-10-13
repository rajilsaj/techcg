import { browserLocalPersistence, GoogleAuthProvider, setPersistence, signInWithPopup, signOut, type Auth, type User } from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import type { Key, T } from "@/i18n";

function requireAuth(): Auth {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is only available in the browser.");
  return auth;
}

/** Google sign-in popup. The server then checks the account (see AUTH.md). */
export async function signInWithGoogle(): Promise<User> {
  const auth = requireAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(requireAuth());
}

/* ---------- Error copy ---------- */

const ERROR_KEYS: Record<string, Key> = {
  "auth/popup-closed-by-user": "authError.popupClosed",
  "auth/cancelled-popup-request": "authError.popupCancelled",
  "auth/popup-blocked": "authError.popupBlocked",
  "auth/too-many-requests": "authError.tooManyRequests",
  "auth/network-request-failed": "authError.network",
  "auth/operation-not-allowed": "authError.notAllowed",
  "auth/account-exists-with-different-credential": "authError.accountExists",
  "auth/unauthorized-domain": "authError.unauthorizedDomain",
};

export function describeAuthError(error: unknown, t: T): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && ERROR_KEYS[code]) return t(ERROR_KEYS[code]);

  const message = (error as { message?: string } | null)?.message;
  if (message) {
    return message.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[^)]+\)\.?$/, "");
  }
  return t("authError.generic");
}
