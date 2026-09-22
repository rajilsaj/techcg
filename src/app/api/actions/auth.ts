"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, clearSession } from "@/lib/auth";

export async function loginAction(
  username: string,
  password: string
): Promise<{ error?: string }> {
  if (!username || !password) {
    return { error: "Nom d'utilisateur et mot de passe requis" };
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    return { error: "Identifiants invalides" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: "Identifiants invalides" };
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
    return { error: "Tous les champs sont requis" };
  }

  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas" };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères" };
  }

  if (username.length < 3 || username.length > 20) {
    return { error: "Le nom d'utilisateur doit contenir entre 3 et 20 caractères" };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { error: "Le nom d'utilisateur ne peut contenir que des lettres, des chiffres, _ et -" };
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    return { error: "Ce nom d'utilisateur est déjà pris" };
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
