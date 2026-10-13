# Authentication

Members sign in with their **Google account** only, through Firebase Auth in the browser (no password, no phone number). The server never trusts the browser: it verifies the Firebase ID token, then maps it to a row in the `User` table and issues its own session cookie.

```
Browser (Firebase Auth: Google)
   │  ID token
   ▼
POST /api/v1/auth/session                       src/app/api/v1/auth/session/route.ts
   1. verifyFirebaseIdToken(idToken)             src/lib/auth-sync/firebase.ts
        Firebase Admin SDK: signature, expiry, audience, revocation
        Google accounts with a verified email only
        → { firebaseUid, email, displayName? }
   2. syncIdentity(identity)                     src/lib/auth-sync/identity.ts
        idempotent upsert into "User", keyed by the unique "firebaseUid"
   3. createSession(userId)                      src/lib/auth.ts
        signed, httpOnly "session" cookie (30 days)
   ▼
200 { username, isNew }
```

## Guarantees

- **Idempotent.** Re-sending the same token returns the same account. An existing email is never overwritten; a missing one is filled in. Two simultaneous first sign-ins of the same person resolve to one account (unique `firebaseUid`), and username clashes retry with the next free name (`jean`, `jean2`, …).
- **Google only.** Tokens from any other sign-in method (SMS, email link, anonymous…) or without a verified email are refused.
- **Suspended accounts** (`banned`, or disabled in Firebase) get no session.
- **Predictable errors.** Every failure returns `{ "error": { "code", "message" } }` with a fixed status; database and SDK details are logged server-side, never returned.

| `code` | Status | When |
|---|---|---|
| `invalid_request` | 400 | missing, empty or oversized `idToken`, malformed JSON |
| `unsupported_provider` | 400 | not a Google sign-in, or no verified email |
| `invalid_token` | 401 | expired, forged or wrong-project token |
| `token_revoked` | 401 | token revoked in Firebase |
| `account_suspended` | 403 | member suspended in the admin, or user disabled in Firebase |
| `auth_unavailable` | 503 | Firebase Admin credentials missing or invalid on the server |
| `internal_error` | 500 | anything else (e.g. database unavailable) |

`DELETE /api/v1/auth/session` signs out.

## Database access

The app reaches PostgreSQL (Supabase) only from the server, through Prisma (`POSTGRES_PRISMA_URL`, role `postgres`). No Supabase key is used by the app, and no secret has a `NEXT_PUBLIC_` prefix.

Supabase's public REST API is locked: every table in `public` has Row Level Security enabled with no policies, and the `anon` / `authenticated` roles have no table privileges (migration `20261013010000_lock_down_public_api`). Tables added by later Prisma migrations inherit "no API access" by default; enable RLS on them too.

## Server environment variables

| Variable | Purpose |
|---|---|
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin service account (token verification) |
| `SESSION_SECRET` | signs the session cookie (falls back to `SUPABASE_JWT_SECRET`, then the database URL) |
| `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | database |
