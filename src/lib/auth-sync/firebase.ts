import type { DecodedIdToken } from "firebase-admin/auth";
import { FirebaseAdminNotConfiguredError, getFirebaseAdminAuth } from "../firebase-admin";
import { AuthSyncError } from "./errors";

/** Sign-in methods the site offers: Google, SMS, and the email link used for account recovery. */
const PROVIDERS = { "google.com": "google", phone: "phone", password: "email_link", emailLink: "email_link" } as const;
export type SignInProvider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

/** What the rest of the backend needs to know about a verified Firebase user. */
export interface VerifiedIdentity {
  firebaseUid: string;
  provider: SignInProvider;
  /** Only when Firebase vouches for it (verified email or Google account). */
  email: string | null;
  /** E.164, from SMS sign-in. */
  phone: string | null;
  displayName: string | null;
}

/** Maps a decoded token to an identity, rejecting sign-in methods the site doesn't offer. */
export function identityFromToken(token: DecodedIdToken): VerifiedIdentity {
  const provider = PROVIDERS[token.firebase?.sign_in_provider as keyof typeof PROVIDERS];
  if (!provider) throw new AuthSyncError("unsupported_provider");

  const emailTrusted = !!token.email && (token.email_verified === true || provider === "google");
  return {
    firebaseUid: token.uid,
    provider,
    email: emailTrusted ? token.email!.toLowerCase() : null,
    phone: token.phone_number ?? null,
    displayName: typeof token.name === "string" && token.name.trim() ? token.name.trim() : null,
  };
}

/**
 * Verifies a client ID token with the Firebase Admin SDK (signature, expiry,
 * audience and revocation) and returns the identity it proves.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedIdentity> {
  let token: DecodedIdToken;
  try {
    token = await getFirebaseAdminAuth().verifyIdToken(idToken, true);
  } catch (error) {
    if (error instanceof FirebaseAdminNotConfiguredError) throw new AuthSyncError("auth_unavailable", error);
    const code = (error as { code?: string })?.code ?? "";
    if (code === "auth/id-token-revoked") throw new AuthSyncError("token_revoked");
    if (code === "auth/user-disabled") throw new AuthSyncError("account_suspended");
    // Anything outside auth/* means the Admin SDK itself failed (e.g. a malformed private key).
    if (!code.startsWith("auth/")) throw new AuthSyncError("auth_unavailable", error);
    throw new AuthSyncError("invalid_token");
  }
  return identityFromToken(token);
}
