import { NextRequest, NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { prisma } from "@/lib/db";
import { createSession, clearSession } from "@/lib/auth";
import { getFirebaseAdminAuth, FirebaseAdminNotConfiguredError } from "@/lib/firebase-admin";
import { getT } from "@/i18n/server";

const USERNAME_MAX = 20;

function slugify(input: string) {
  return input.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]+/g, "").slice(0, USERNAME_MAX);
}

function baseUsername(token: DecodedIdToken) {
  const fromName = token.name ? slugify(String(token.name)) : "";
  const fromEmail = token.email ? slugify(token.email.split("@")[0]) : "";
  const candidate = fromName.length >= 3 ? fromName : fromEmail.length >= 3 ? fromEmail : "";
  return candidate || `user_${token.uid.slice(0, 6).toLowerCase()}`;
}

async function uniqueUsername(base: string) {
  let candidate = base;
  let n = 1;
  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    const suffix = String(++n);
    candidate = `${base.slice(0, USERNAME_MAX - suffix.length)}${suffix}`;
  }
  return candidate;
}

/**
 * POST /api/v1/auth/session
 * Exchanges a Firebase ID token (Google or phone sign-in) for the site's
 * session cookie. New users are registered automatically.
 */
export async function POST(request: NextRequest) {
  const t = await getT();
  const { idToken } = await request.json().catch(() => ({}));

  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  let token: DecodedIdToken;
  try {
    token = await getFirebaseAdminAuth().verifyIdToken(idToken);
  } catch (error) {
    if (error instanceof FirebaseAdminNotConfiguredError) {
      console.error(error.message);
      return NextResponse.json(
        { error: t("authApi.notConfigured") },
        { status: 503 }
      );
    }
    const code = (error as { code?: string })?.code ?? "";
    if (!code.startsWith("auth/")) {
      // Anything outside auth/* means the Admin SDK itself failed (e.g. malformed private key).
      console.error("Firebase Admin initialization failed:", error);
      return NextResponse.json(
        { error: t("authApi.invalidCredentials") },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: t("authApi.invalidToken") }, { status: 401 });
  }

  const email = token.email ?? null;
  const phone = token.phone_number ?? null;

  let user = await prisma.user.findUnique({
    where: { firebaseUid: token.uid },
    select: { id: true, username: true, email: true, phone: true },
  });
  let isNew = false;

  if (!user) {
    user = await prisma.user.create({
      data: {
        username: await uniqueUsername(baseUsername(token)),
        firebaseUid: token.uid,
        email,
        phone,
      },
      select: { id: true, username: true, email: true, phone: true },
    });
    isNew = true;
  } else if ((email && !user.email) || (phone && !user.phone)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: user.email ?? email, phone: user.phone ?? phone },
    });
  }

  await createSession(user.id);

  return NextResponse.json({ username: user.username, isNew });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
