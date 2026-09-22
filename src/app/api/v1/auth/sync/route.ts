import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

// Lazy initialize Firebase Admin SDK (only when route is called)
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      "Firebase Admin credentials not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL."
    );
  }

  const serviceAccount = {
    projectId,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    clientEmail,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
}

// Lazy initialize Supabase Admin Client
let supabaseAdmin: any = null;

function initializeSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  supabaseAdmin = createClient(url, key);
  return supabaseAdmin;
}

/**
 * POST /api/v1/auth/sync
 *
 * Firebase → Supabase Token Exchange
 * 1. Verify Firebase ID token
 * 2. Upsert user to Supabase public.users
 * 3. Mint custom Supabase JWT with Firebase UID
 * 4. Return JWT for direct client-side Supabase access
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin SDK and Supabase Admin Client
    initializeFirebaseAdmin();
    const sb = initializeSupabaseAdmin();

    const { firebaseToken } = await request.json();

    if (!firebaseToken) {
      return NextResponse.json(
        { error: "Firebase token required" },
        { status: 400 }
      );
    }

    // Step 1: Verify Firebase ID Token
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    } catch (error) {
      console.error("Firebase token verification failed:", error);
      return NextResponse.json(
        { error: "Invalid or expired Firebase token" },
        { status: 401 }
      );
    }

    const { uid, email, name, phone_number } = decodedToken;

    // Step 2: Upsert user to Supabase (service role - bypasses RLS)
    const { data: user, error: upsertError } = await sb
      .from("users")
      .upsert(
        {
          id: uid, // Firebase UID as primary key
          email: email || null,
          username: name || email?.split("@")[0] || uid,
          phone: phone_number || null,
          firebase_uid: uid,
          last_sign_in: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to sync user" },
        { status: 500 }
      );
    }

    // Step 3: Mint Custom Supabase JWT
    // Custom JWT with Firebase UID as claim
    const customToken = jwt.sign(
      {
        sub: uid, // Subject (user ID for auth.uid())
        email: email,
        aud: "authenticated",
        role: "authenticated",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      },
      process.env.SUPABASE_JWT_SECRET!,
      { algorithm: "HS256" }
    );

    // Step 4: Return token and user data
    return NextResponse.json(
      {
        success: true,
        token: customToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          phone: user.phone,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Auth sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
