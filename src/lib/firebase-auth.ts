import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Create a new user account
 */
export async function firebaseSignUp(email: string, password: string): Promise<User | null> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");

    await setPersistence(auth, browserLocalPersistence);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function firebaseSignIn(email: string, password: string): Promise<User | null> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");

    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function firebaseSignOut(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

/**
 * Get current user
 */
export function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve, reject) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      reject(new Error("Firebase not initialized"));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: AuthUser | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Get ID token for API requests
 */
export async function getFirebaseToken(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.error("Get token error:", error);
    return null;
  }
}
