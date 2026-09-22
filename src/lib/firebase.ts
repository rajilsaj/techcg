import { initializeApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBF9PkwKjnBAHLwQKpONkV0XjoHRi_SF8Y",
  authDomain: "techcg.firebaseapp.com",
  projectId: "techcg",
  storageBucket: "techcg.firebasestorage.app",
  messagingSenderId: "378884374923",
  appId: "1:378884374923:web:66e04ead5a8bd4b8196f8e",
  measurementId: "G-Y6YRKQFDHT",
};

let app: any;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

// Initialize Firebase (only on client side)
if (typeof window !== "undefined") {
  app = initializeApp(firebaseConfig);

  // Initialize Auth
  auth = getAuth(app);
  auth.useDeviceLanguage();

  // Initialize Firestore
  db = getFirestore(app);

  // Initialize Analytics
  analytics = getAnalytics(app);
}

export { app, auth, db, analytics };

// Export Firebase services
export const getFirebaseAuth = () => auth;
export const getFirebaseDb = () => db;
export const getFirebaseAnalytics = () => analytics;
