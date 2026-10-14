"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateKey, MAX_KEYS_PER_MEMBER } from "@/lib/api/keys";

/** Creates a personal API key. The key itself is returned only this once. */
export async function createApiKeyAction(name: string): Promise<{ key?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Connectez-vous pour créer une clé." };
  const label = (name ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || "Ma clé";
  if ((await prisma.apiKey.count({ where: { userId: session.userId } })) >= MAX_KEYS_PER_MEMBER) {
    return { error: `${MAX_KEYS_PER_MEMBER} clés au plus : révoquez-en une d'abord.` };
  }
  const { key, prefix, hash } = generateKey();
  await prisma.apiKey.create({ data: { userId: session.userId, name: label, prefix, hash } });
  revalidatePath("/mon-espace");
  return { key };
}

/** Revokes one of the member's keys (apps using it stop working at once). */
export async function revokeApiKeyAction(id: number): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Connectez-vous." };
  await prisma.apiKey.deleteMany({ where: { id, userId: session.userId } });
  revalidatePath("/mon-espace");
  return {};
}
