"use client";

import { useState, useEffect, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import {
  firebaseSignUp,
  firebaseSignIn,
  firebaseSignOut,
  onAuthChange,
} from "@/lib/firebase-auth";
import {
  initializeSupabaseWithFirebaseAuth,
  getSupabaseClient,
  clearHybridAuth,
  getSupabaseJWT,
} from "@/lib/hybrid-auth";
import { SupabaseClient } from "@supabase/supabase-js";

export interface HybridAuthUser {
  firebase: FirebaseUser;
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface UseHybridAuthReturn {
  firebaseUser: FirebaseUser | null;
  supabaseClient: SupabaseClient | null;
  jwt: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

/**
 * Hybrid Authentication Hook
 * Combines Firebase Auth with Supabase direct client access
 *
 * Usage:
 * const { firebaseUser, supabaseClient, signIn, signOut } = useHybridAuth();
 *
 * // After sign in:
 * const { data } = await supabaseClient.from('users').select('*');
 */
export function useHybridAuth(): UseHybridAuthReturn {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(
    null
  );
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => {
      if (authUser) {
        setFirebaseUser(authUser as FirebaseUser);
        // Initialize Supabase with Firebase token
        initializeSupabaseWithFirebaseAuth()
          .then((client) => {
            setSupabaseClient(client);
            return getSupabaseJWT();
          })
          .then((token) => {
            setJwt(token);
            setError(null);
          })
          .catch((err) => {
            setError(`Failed to initialize Supabase: ${err.message}`);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setFirebaseUser(null);
        setSupabaseClient(null);
        setJwt(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignUp = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await firebaseSignUp(email, password);
      // Firebase state change will trigger Supabase initialization
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await firebaseSignIn(email, password);
      // Firebase state change will trigger Supabase initialization
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      setError(null);
      await firebaseSignOut();
      clearHybridAuth();
      setFirebaseUser(null);
      setSupabaseClient(null);
      setJwt(null);
    } catch (err: any) {
      setError(err.message || "Failed to sign out");
      throw err;
    }
  }, []);

  const handleRefreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const newJwt = await getSupabaseJWT();
      setJwt(newJwt);
      return newJwt;
    } catch (err: any) {
      setError(`Failed to refresh token: ${err.message}`);
      return null;
    }
  }, []);

  return {
    firebaseUser,
    supabaseClient,
    jwt,
    loading,
    error,
    isAuthenticated: firebaseUser !== null && supabaseClient !== null,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshToken: handleRefreshToken,
  };
}
