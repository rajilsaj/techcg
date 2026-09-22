# Hybrid Firebase + Supabase Authentication System

Production-grade hybrid authentication architecture combining Firebase Auth for identity verification with Supabase PostgreSQL for direct client-side data access via Row Level Security (RLS).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  - Firebase Client SDK (Google OAuth, SMS OTP)              │
│  - Supabase Client SDK (Direct RLS-secured queries)         │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
    1. Sign in with Google/SMS          │
             │                          │
    ┌────────▼────────┐                │
    │  Firebase Auth   │                │
    │  (Identity)      │                │
    └────────┬────────┘                │
             │                          │
    2. Get Firebase ID Token            │
             │                          │
    ┌────────▼──────────────────────────▼─────────────────┐
    │        Vercel API Route (/api/v1/auth/sync)         │
    │  1. Verify Firebase ID Token (firebase-admin)       │
    │  2. Upsert User to Supabase (service role)          │
    │  3. Mint Custom JWT (with Firebase UID claim)       │
    │  4. Return JWT to Client                            │
    └────────┬──────────────────────────────────────────┘
             │
    3. Return Custom JWT
             │
    ┌────────▼──────────────────────────┐
    │  Supabase Client (authenticated)   │
    │  - Sets JWT as session token       │
    │  - Direct database queries via RLS │
    └────────────────────────────────────┘
             │
    4. Direct Query (RLS enforced)
             │
    ┌────────▼──────────────────────────┐
    │   Supabase PostgreSQL (RLS)        │
    │  - auth.uid() validates JWT claims │
    │  - Policies restrict access        │
    └────────────────────────────────────┘
```

## Setup Instructions

### 1. Environment Variables

Add to `.env.local`:

```bash
# Firebase Admin SDK (for Vercel API route)
FIREBASE_PROJECT_ID=techcg
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@techcg.iam.gserviceaccount.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Keep secret!
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Firebase Client SDK (for browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBF9PkwKjnBAHLwQKpONkV0XjoHRi_SF8Y
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=techcg.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=techcg
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=techcg.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=378884374923
NEXT_PUBLIC_FIREBASE_APP_ID=1:378884374923:web:66e04ead5a8bd4b8196f8e
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-Y6YRKQFDHT
```

**Getting Firebase Admin Credentials:**
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy the JSON values to environment variables

**Getting Supabase Credentials:**
1. Supabase Dashboard → Project Settings → API
2. Copy `URL`, `anon key`, `service_role key`
3. JWT Secret: Settings → API → JWT Secret

### 2. Database Migration

Run the Supabase migration in `supabase/migrations/001_auth_schema.sql`:

```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase SQL Editor:
# Copy and paste the entire SQL migration
```

This creates:
- `public.users` table (Firebase UID as PK)
- `public.user_profiles` table (extended user data)
- `public.user_sessions` table (session tracking)
- RLS policies (restricting access to own records)

### 3. Install Dependencies

```bash
npm install firebase firebase-admin jsonwebtoken
npm install @supabase/supabase-js
```

### 4. API Route Setup

The API route is ready at: `src/app/api/v1/auth/sync/route.ts`

```
POST /api/v1/auth/sync
Content-Type: application/json

{
  "firebaseToken": "eyJhbGc..."
}

Response:
{
  "success": true,
  "token": "eyJhbGc...", // Custom JWT
  "user": {
    "id": "firebase-uid",
    "email": "user@example.com",
    "username": "john_doe",
    "phone": "+1234567890"
  }
}
```

## Frontend Usage

### Basic Setup

```typescript
// pages/login.tsx
"use client";
import { useHybridAuth } from "@/hooks/useHybridAuth";

export default function LoginPage() {
  const { firebaseUser, isAuthenticated, signIn, signOut, error } = useHybridAuth();

  if (isAuthenticated) {
    return (
      <div>
        <p>Welcome {firebaseUser?.email}</p>
        <button onClick={signOut}>Logout</button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      signIn("user@example.com", "password");
    }}>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input type="email" placeholder="Email" required />
      <input type="password" placeholder="Password" required />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### Direct Supabase Queries (RLS-Secured)

```typescript
// After authentication
const { supabaseClient } = useHybridAuth();

// These queries are secured by RLS - users only see their own data
async function getUserData() {
  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", firebaseUser.uid)
    .single();
  
  return data;
}

async function updateProfile(updates) {
  const { data, error } = await supabaseClient
    .from("users")
    .update(updates)
    .eq("id", firebaseUser.uid)
    .select()
    .single();
  
  return data;
}

async function getUserSessions() {
  const { data, error } = await supabaseClient
    .from("user_sessions")
    .select("*")
    .eq("user_id", firebaseUser.uid);
  
  return data;
}
```

### Using Helper Functions

```typescript
import {
  getUserProfile,
  updateUserProfile,
  getUserData,
  createUserSession,
} from "@/lib/hybrid-auth";

// Get user profile
const { data: profile } = await getUserProfile(userId);

// Update profile
const { data: updated } = await updateUserProfile(userId, {
  bio: "Updated bio",
  avatar_url: "https://example.com/avatar.jpg",
});

// Create session record
await createUserSession(userId, {
  ip_address: "192.168.1.1",
  user_agent: navigator.userAgent,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});

// Get user extended data (users + user_profiles joined)
const { data: fullData } = await getUserData(userId);
```

## Security Features

### 1. Firebase Token Verification
- Verifies Firebase ID token before issuing custom JWT
- Server-side verification using Firebase Admin SDK
- Prevents token spoofing

### 2. Row Level Security (RLS)
- Each user can only read/write their own records
- `auth.uid()` claim from custom JWT enforces access
- SQL policies prevent unauthorized data access

```sql
-- Example RLS policy
CREATE POLICY "users_read_own_profile"
ON public.users
FOR SELECT
USING (auth.uid()::text = id); -- Only if JWT uid matches record id
```

### 3. Custom JWT Claims
- Firebase UID embedded in JWT `sub` claim
- Used by RLS policies to enforce access control
- Signed with Supabase JWT Secret

### 4. Service Role Isolation
- Vercel API route uses service role key (bypasses RLS)
- Only for upsert operations during auth sync
- Frontend uses custom JWT (respects RLS)

## Direct Database Access Benefits

✅ **Bypass Vercel API**: Direct Supabase queries avoid serverless overhead
✅ **Real-time Updates**: Use Supabase real-time subscriptions
✅ **Optimized Queries**: Complex joins and filters directly in SQL
✅ **RLS Protection**: Automatic row-level access control
✅ **Cost Efficient**: No serverless invocation costs for CRUD

## Troubleshooting

### JWT Token Expired
```typescript
const { refreshToken } = useHybridAuth();
const newToken = await refreshToken();
```

### RLS Policy Denying Access
1. Check Firebase UID matches JWT `sub` claim
2. Verify custom JWT is set in Supabase client
3. Check RLS policy conditions in Supabase dashboard

### Supabase Connection Issues
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and keys
2. Check CORS settings in Supabase dashboard
3. Ensure RLS policies don't block service role

## Performance Tips

1. **Cache JWT** - Reuse token while valid (auto-handled by `useHybridAuth`)
2. **Use Supabase Real-time** - Subscribe to changes instead of polling
3. **Batch Queries** - Use SQL transactions for multiple operations
4. **Index Frequently Queried Columns** - Already done for `email`, `username`, `firebase_uid`

## Production Checklist

- [ ] Set strong JWT secret in Supabase
- [ ] Configure Firebase security rules
- [ ] Set up database backups (Supabase auto-handles)
- [ ] Enable row-level security on all tables
- [ ] Review RLS policies for correctness
- [ ] Set up monitoring/logging for auth sync endpoint
- [ ] Configure CORS for production domain
- [ ] Test token expiration and refresh flow
- [ ] Load test API route to ensure scalability

## References

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JWT Guide](https://supabase.com/docs/guides/auth/custom-claims)
- [JWT.io](https://jwt.io) - Decode and verify tokens
