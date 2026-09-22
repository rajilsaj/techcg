import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type Auth,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import type { Key, T } from "@/i18n";

const MAGIC_LINK_EMAIL_KEY = "techcg:magicLinkEmail";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

function requireAuth(): Auth {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is only available in the browser.");
  return auth;
}

/* ---------- Google OAuth ---------- */

export async function signInWithGoogle(): Promise<User> {
  const auth = requireAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/* ---------- Phone / SMS OTP ---------- */

let recaptcha: RecaptchaVerifier | null = null;

function getRecaptcha(containerId: string): RecaptchaVerifier {
  if (!recaptcha) {
    recaptcha = new RecaptchaVerifier(requireAuth(), containerId, { size: "invisible" });
  }
  return recaptcha;
}

export function resetRecaptcha(): void {
  recaptcha?.clear();
  recaptcha = null;
}

export async function startPhoneSignIn(
  phoneE164: string,
  recaptchaContainerId: string
): Promise<ConfirmationResult> {
  const auth = requireAuth();
  await setPersistence(auth, browserLocalPersistence);
  try {
    return await signInWithPhoneNumber(auth, phoneE164, getRecaptcha(recaptchaContainerId));
  } finally {
    // reCAPTCHA tokens are single-use; start fresh for any resend.
    resetRecaptcha();
  }
}

export async function confirmPhoneCode(
  confirmation: ConfirmationResult,
  code: string
): Promise<User> {
  const result = await confirmation.confirm(code);
  return result.user;
}

/* ---------- Email magic link (recovery) ---------- */

export async function sendMagicLink(email: string): Promise<void> {
  const auth = requireAuth();
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/auth/complete`,
    handleCodeInApp: true,
  });
  window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email);
}

/**
 * Completes a magic-link sign-in. Returns null when the current URL is not a
 * sign-in link. Throws `{ code: "auth/missing-email" }` when the email that
 * requested the link isn't available on this device (different browser).
 */
export async function completeMagicLink(emailOverride?: string): Promise<User | null> {
  const auth = requireAuth();
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return null;

  const email = emailOverride?.trim() || window.localStorage.getItem(MAGIC_LINK_EMAIL_KEY);
  if (!email) {
    const error = new Error("Email required") as Error & { code: string };
    error.code = "auth/missing-email";
    throw error;
  }

  const result = await signInWithEmailLink(auth, email, href);
  window.localStorage.removeItem(MAGIC_LINK_EMAIL_KEY);
  return result.user;
}

/* ---------- Error copy ---------- */

const ERROR_KEYS: Record<string, Key> = {
  "auth/popup-closed-by-user": "authError.popupClosed",
  "auth/cancelled-popup-request": "authError.popupCancelled",
  "auth/popup-blocked": "authError.popupBlocked",
  "auth/invalid-phone-number": "authError.invalidPhone",
  "auth/missing-phone-number": "authError.missingPhone",
  "auth/too-many-requests": "authError.tooManyRequests",
  "auth/invalid-verification-code": "authError.invalidCode",
  "auth/code-expired": "authError.codeExpired",
  "auth/network-request-failed": "authError.network",
  "auth/operation-not-allowed": "authError.notAllowed",
  "auth/invalid-email": "authError.invalidEmail",
  "auth/invalid-action-code": "authError.invalidLink",
  "auth/expired-action-code": "authError.expiredLink",
  "auth/account-exists-with-different-credential": "authError.accountExists",
  "auth/unauthorized-domain": "authError.unauthorizedDomain",
  "auth/captcha-check-failed": "authError.captcha",
  "auth/missing-email": "authError.missingEmail",
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

/* ---------- Email/password (legacy helpers, still used by hooks) ---------- */

export async function firebaseSignUp(email: string, password: string): Promise<User | null> {
  const auth = requireAuth();
  await setPersistence(auth, browserLocalPersistence);
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function firebaseSignIn(email: string, password: string): Promise<User | null> {
  const auth = requireAuth();
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(requireAuth());
}

export function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve, reject) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      reject(new Error("Firebase not initialized"));
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export function onAuthChange(callback: (user: AuthUser | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null);
  });
}

export async function getFirebaseToken(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user ? await user.getIdToken() : null;
  } catch (error) {
    console.error("Get token error:", error);
    return null;
  }
}
