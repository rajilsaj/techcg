import { NextRequest, NextResponse } from "next/server";
import { createSession, clearSession } from "@/lib/auth";
import { AuthSyncError, toAuthSyncErrorResponse } from "@/lib/auth-sync/errors";
import { verifyFirebaseIdToken } from "@/lib/auth-sync/firebase";
import { syncIdentity } from "@/lib/auth-sync/identity";

const MAX_TOKEN_LENGTH = 8192; // Firebase ID tokens are ~1 KB

/**
 * POST /api/v1/auth/session  { idToken }
 *
 * Exchanges a Firebase ID token (Google, SMS or recovery email link) for the
 * site's session cookie:
 *   1. verify the token with the Firebase Admin SDK (signature, expiry, revocation);
 *   2. upsert the identity into the users table, keyed by its Firebase UID;
 *   3. set the signed session cookie.
 * Safe to retry: the same token always yields the same account.
 *
 * 200 { username, isNew } · errors: { error: { code, message } } (see lib/auth-sync/errors.ts)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
    const idToken = body?.idToken;
    if (typeof idToken !== "string" || !idToken || idToken.length > MAX_TOKEN_LENGTH) {
      throw new AuthSyncError("invalid_request");
    }

    const identity = await verifyFirebaseIdToken(idToken);
    const user = await syncIdentity(identity);
    await createSession(user.userId);

    return NextResponse.json({ username: user.username, isNew: user.isNew });
  } catch (error) {
    return toAuthSyncErrorResponse(error);
  }
}

/** DELETE /api/v1/auth/session: signs out. Always succeeds. */
export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
