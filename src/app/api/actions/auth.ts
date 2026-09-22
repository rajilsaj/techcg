"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, clearSession } from "@/lib/auth";
import { getT } from "@/i18n/server";

export async function loginAction(
  username: string,
  password: string
): Promise<{ error?: string }> {
  const t = await getT();
  if (!username || !password) {
    return { error: t("action.credentialsRequired") };
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    return { error: t("action.invalidCredentials") };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: t("action.invalidCredentials") };
  }

  await createSession(user.id);
  redirect("/");
}

export async function registerAction(
  username: string,
  password: string,
  confirmPassword: string
): Promise<{ error?: string }> {
  const t = await getT();
  if (!username || !password || !confirmPassword) {
    return { error: t("action.allFieldsRequired") };
  }

  if (password !== confirmPassword) {
    return { error: t("action.passwordMismatch") };
  }

  if (password.length < 6) {
    return { error: t("action.passwordTooShort") };
  }

  if (username.length < 3 || username.length > 20) {
    return { error: t("action.usernameLength") };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { error: t("action.usernameChars") };
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    return { error: t("action.usernameTaken") };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      karma: 0,
    },
    select: {
      id: true,
    },
  });

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/");
}
