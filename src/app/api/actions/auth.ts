"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, clearSession } from "@/lib/auth";

export async function loginAction(
  username: string,
  password: string
): Promise<{ error?: string }> {
  if (!username || !password) {
    return { error: "Username and password required" };
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    return { error: "Invalid credentials" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: "Invalid credentials" };
  }

  await createSession(user.id);
  redirect("/");
}

export async function registerAction(
  username: string,
  password: string,
  confirmPassword: string
): Promise<{ error?: string }> {
  if (!username || !password || !confirmPassword) {
    return { error: "All fields required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  if (username.length < 3 || username.length > 20) {
    return { error: "Username must be 3-20 characters" };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, _, and -" };
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    return { error: "Username already taken" };
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
