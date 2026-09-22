# Firebase Setup Guide

Firebase is now configured for authentication and analytics.

## Configuration

The Firebase configuration is stored in `src/lib/firebase.ts` and initialized client-side only.

**Project Details:**
- Project ID: `techcg`
- Auth Domain: `techcg.firebaseapp.com`
- Storage Bucket: `techcg.firebasestorage.app`

## Available Services

### Authentication (`src/lib/firebase-auth.ts`)

```typescript
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

function MyComponent() {
  const { user, signUp, signIn, signOut } = useFirebaseAuth();

  // Sign up
  await signUp("user@example.com", "password123");

  // Sign in
  await signIn("user@example.com", "password123");

  // Sign out
  await signOut();

  // Get current user
  const currentUser = user;
}
```

### Firebase API Requests (`src/lib/firebase-api.ts`)

Automatically adds Firebase token to API requests:

```typescript
import { firebaseApiPost } from "@/lib/firebase-api";

// POST request with auth token
const data = await firebaseApiPost("/api/v1/stories", {
  title: "My Story",
  url: "https://example.com",
});
```

### React Hook (`src/hooks/useFirebaseAuth.ts`)

```typescript
function LoginForm() {
  const { user, loading, error, signIn } = useFirebaseAuth();

  if (loading) return <div>Loading...</div>;
  if (user) return <div>Welcome {user.email}</div>;

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      signIn("user@example.com", "password");
    }}>
      {error && <p>{error}</p>}
      {/* form inputs */}
    </form>
  );
}
```

## Integration with API

To protect API endpoints with Firebase:

1. **Get Firebase token** from client:
```typescript
const token = await getFirebaseToken();
```

2. **Verify token** on server (in API route):
```typescript
import { getAuth } from "firebase-admin/auth";

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return unauthorized();

  const decodedToken = await getAuth().verifyIdToken(token);
  const userId = decodedToken.uid;
  // ... proceed with authenticated request
}
```

## Services Available

### ✅ Authentication
- Email/password sign up and sign in
- Sign out
- Session persistence (localStorage)
- Auth state management

### ✅ Analytics
- Page view tracking
- Event tracking
- User engagement metrics

### 🔧 Coming Soon
- Firestore Database
- Storage (file uploads)
- Cloud Functions
- Real-time messaging

## Environment Variables

No additional environment variables needed - Firebase config is embedded in `src/lib/firebase.ts`

For production, consider moving config to environment variables:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# etc.
```

## Security Notes

- ⚠️ Firebase config is public (intentional - it's client-side)
- 🔒 Use Firestore Security Rules to protect data
- 🔒 Verify tokens on server before accepting API requests
- 🔒 Never store sensitive data in Firestore without encryption

## Testing

Test Firebase auth locally:

```bash
npm run dev
# Visit http://localhost:3000
# Open browser console
# Test auth functions
```

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
