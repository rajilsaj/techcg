import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession, type Session } from "./auth";

/**
 * Guard for /godmod pages. Logged-out visitors go to the login page;
 * logged-in non-admins get a 404 so the admin area isn't advertised.
 * Call it in each page as well as the layout: layouts aren't re-rendered
 * on client-side navigation between sibling pages.
 */
export async function requireAdminPage(path: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/connexion?next=${encodeURIComponent(path)}`);
  if (!session.isAdmin) notFound();
  return session;
}

/** Guard for /api/admin routes: returns an error response, or null when allowed. */
export async function adminApiError(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
