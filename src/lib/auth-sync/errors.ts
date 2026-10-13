import { NextResponse } from "next/server";
import { t, type Key } from "@/i18n";

/**
 * Every failure of the sign-in sync maps to one of these codes. The JSON body is
 * always `{ error: { code, message } }`; internal details are logged, never sent.
 */
export const AUTH_SYNC_ERRORS = {
  invalid_request: { status: 400, message: "authApi.invalidRequest" },
  invalid_token: { status: 401, message: "authApi.invalidToken" },
  token_revoked: { status: 401, message: "authApi.tokenRevoked" },
  unsupported_provider: { status: 400, message: "authApi.unsupportedProvider" },
  account_suspended: { status: 403, message: "action.accountSuspended" },
  auth_unavailable: { status: 503, message: "authApi.notConfigured" },
  internal_error: { status: 500, message: "authApi.internal" },
} as const satisfies Record<string, { status: number; message: Key }>;

export type AuthSyncErrorCode = keyof typeof AUTH_SYNC_ERRORS;

export interface AuthSyncErrorBody {
  error: { code: AuthSyncErrorCode; message: string };
}

export class AuthSyncError extends Error {
  constructor(
    readonly code: AuthSyncErrorCode,
    /** Logged server-side only. */
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "AuthSyncError";
  }
}

export function authSyncErrorResponse(code: AuthSyncErrorCode): NextResponse<AuthSyncErrorBody> {
  const { status, message } = AUTH_SYNC_ERRORS[code];
  return NextResponse.json({ error: { code, message: t(message) } }, { status });
}

/** Turns anything thrown during a sync into a predictable JSON error response. */
export function toAuthSyncErrorResponse(error: unknown): NextResponse<AuthSyncErrorBody> {
  if (error instanceof AuthSyncError) {
    if (error.code === "auth_unavailable" || error.code === "internal_error") {
      console.error(`[auth-sync] ${error.code}:`, error.cause ?? error);
    }
    return authSyncErrorResponse(error.code);
  }
  console.error("[auth-sync] unexpected error:", error);
  return authSyncErrorResponse("internal_error");
}
