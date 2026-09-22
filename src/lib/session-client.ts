import type { User } from "firebase/auth";

export interface EstablishedSession {
  username: string;
  isNew: boolean;
}

export async function establishSession(user: User): Promise<EstablishedSession> {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/v1/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Impossible de finaliser la connexion. Veuillez réessayer.");
  }
  return body as EstablishedSession;
}

export async function endSession(): Promise<void> {
  await fetch("/api/v1/auth/session", { method: "DELETE" });
}
