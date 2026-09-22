"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import {
  firebaseSignUp,
  firebaseSignIn,
  firebaseSignOut,
  onAuthChange,
  getFirebaseToken,
} from "@/lib/firebase-auth";

export interface UseFirebaseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

/**
 * Hook to manage Firebase authentication
 */
export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser as User | null);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, []);

  const handleSignUp = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await firebaseSignUp(email, password);
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
      setUser(null);
    } catch (err: any) {
      setError(err.message || "Failed to sign out");
      throw err;
    }
  }, []);

  const handleGetToken = useCallback(async () => {
    return await getFirebaseToken();
  }, []);

  return {
    user,
    loading,
    error,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    getToken: handleGetToken,
  };
}
