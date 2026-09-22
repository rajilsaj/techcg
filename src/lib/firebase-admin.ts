import * as admin from "firebase-admin";

export class FirebaseAdminNotConfiguredError extends Error {
  constructor() {
    super(
      "Firebase Admin credentials not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL."
    );
    this.name = "FirebaseAdminNotConfiguredError";
  }
}

export function getFirebaseAdminAuth() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      throw new FirebaseAdminNotConfiguredError();
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, "\n"),
        clientEmail,
      }),
    });
  }

  return admin.auth();
}
