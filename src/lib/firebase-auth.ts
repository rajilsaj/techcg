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

const ERROR_COPY: Record<string, string> = {
  "auth/popup-closed-by-user": "The Google window was closed before finishing. Try again when you're ready.",
  "auth/cancelled-popup-request": "Only one sign-in window can be open at a time.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/invalid-phone-number": "That phone number doesn't look right. Check the country code and digits.",
  "auth/missing-phone-number": "Enter your phone number to continue.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes before trying again.",
  "auth/invalid-verification-code": "That code isn't right. Check the SMS and try again.",
  "auth/code-expired": "That code has expired. Request a new one.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled yet. Please contact support.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/invalid-action-code": "This sign-in link is invalid or has already been used. Request a new one.",
  "auth/expired-action-code": "This sign-in link has expired. Request a new one.",
  "auth/account-exists-with-different-credential":
    "An account already exists for this email with a different sign-in method.",
  "auth/unauthorized-domain": "This domain isn't authorized for sign-in. Add it in the Firebase console.",
  "auth/captcha-check-failed": "Verification failed. Reload the page and try again.",
  "auth/missing-email": "Enter the email address you used to request the link.",
};

export function describeAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && ERROR_COPY[code]) return ERROR_COPY[code];

  const message = (error as { message?: string } | null)?.message;
  if (message) {
    return message.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[^)]+\)\.?$/, "");
  }
  return "Something went wrong. Please try again.";
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
