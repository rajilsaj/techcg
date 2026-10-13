import type { DecodedIdToken } from "firebase-admin/auth";
import { FirebaseAdminNotConfiguredError, getFirebaseAdminAuth } from "../firebase-admin";
import { AuthSyncError } from "./errors";

/** What the rest of the backend needs to know about a verified Google user. */
export interface VerifiedIdentity {
  firebaseUid: string;
  /** Verified by Google. */
  email: string;
  displayName: string | null;
}

/** Maps a decoded token to an identity. Only Google accounts with a verified email are accepted. */
export function identityFromToken(token: DecodedIdToken): VerifiedIdentity {
  if (token.firebase?.sign_in_provider !== "google.com") throw new AuthSyncError("unsupported_provider");
  if (!token.email || token.email_verified !== true) throw new AuthSyncError("unsupported_provider");
  return {
    firebaseUid: token.uid,
    email: token.email.toLowerCase(),
    displayName: typeof token.name === "string" && token.name.trim() ? token.name.trim() : null,
  };
}

/**
 * Verifies a client ID token with the Firebase Admin SDK (signature, expiry,
 * audience and revocation) and returns the Google identity it proves.
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
