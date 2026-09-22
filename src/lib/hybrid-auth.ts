import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { User as FirebaseUser } from "firebase/auth";
import { getCurrentUser } from "./firebase-auth";

let supabaseClient: SupabaseClient | null = null;
let cachedJWT: string | null = null;
let jwtExpiresAt: number = 0;

/**
 * Initialize Supabase client with custom Firebase JWT
 * Should be called after Firebase authentication
 */
export async function initializeSupabaseWithFirebaseAuth(): Promise<SupabaseClient> {
  if (!supabaseClient) {
    // Create initial client without auth
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Exchange Firebase token for Supabase JWT
  const jwtToken = await getSupabaseJWT();

  if (jwtToken) {
    // Set the custom JWT as the session token
    await supabaseClient.auth.setSession({
      access_token: jwtToken,
      refresh_token: "", // Custom tokens don't need refresh
    });
  }

  return supabaseClient;
}

/**
 * Get Supabase JWT by exchanging Firebase ID token
 * Caches the token to avoid excessive API calls
 */
export async function getSupabaseJWT(): Promise<string | null> {
  try {
    const firebaseUser = await getCurrentUser();
    if (!firebaseUser) {
      return null;
    }

    // Return cached JWT if still valid
    if (cachedJWT && Date.now() < jwtExpiresAt - 60000) {
      return cachedJWT;
    }

    // Get Firebase ID token
    const firebaseToken = await firebaseUser.getIdToken();

    // Exchange for Supabase JWT via Vercel API route
    const response = await fetch("/api/v1/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firebaseToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to sync authentication");
    }

    const { token } = await response.json();

    // Cache the JWT (expires in ~1 hour)
    cachedJWT = token;
    jwtExpiresAt = Date.now() + 3600000;

    return token;
  } catch (error) {
    console.error("Error getting Supabase JWT:", error);
    return null;
  }
}

/**
 * Get authenticated Supabase client
 * Creates client if not initialized, or returns existing one
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (!supabaseClient) {
    return initializeSupabaseWithFirebaseAuth();
  }

  // Refresh JWT if expired
  const jwtToken = await getSupabaseJWT();
  if (jwtToken) {
    await supabaseClient.auth.setSession({
      access_token: jwtToken,
      refresh_token: "",
    });
  }

  return supabaseClient;
}

/**
 * Logout: Clear Firebase session and Supabase client
 */
export function clearHybridAuth(): void {
  cachedJWT = null;
  jwtExpiresAt = 0;
  supabaseClient = null;
}

/**
 * Direct Supabase query functions (using custom JWT)
 * These bypass Vercel and go directly to Supabase via RLS
 */

export async function getUserProfile(userId: string) {
  const client = await getSupabaseClient();
  return client.from("users").select("*").eq("id", userId).single();
}

export async function updateUserProfile(
  userId: string,
  updates: Record<string, any>
) {
  const client = await getSupabaseClient();
  return client.from("users").update(updates).eq("id", userId).select().single();
}

export async function getUserData(userId: string) {
  const client = await getSupabaseClient();
  return client.from("user_data").select("*").eq("id", userId).single();
}

export async function updateUserExtendedProfile(
  userId: string,
  profileData: Record<string, any>
) {
  const client = await getSupabaseClient();

  // Upsert user_profiles
  return client.from("user_profiles").upsert(
    {
      user_id: userId,
      ...profileData,
    },
    { onConflict: "user_id" }
  );
}

export async function createUserSession(
  userId: string,
  sessionData: {
    ip_address?: string;
    user_agent?: string;
    expires_at: string;
  }
) {
  const client = await getSupabaseClient();
  return client.from("user_sessions").insert({
    user_id: userId,
    ...sessionData,
  });
}

export async function getUserSessions(userId: string) {
  const client = await getSupabaseClient();
  return client
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function deleteUserSession(sessionId: string) {
  const client = await getSupabaseClient();
  return client.from("user_sessions").delete().eq("id", sessionId);
}
