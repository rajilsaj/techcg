"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { postComment } from "@/lib/publish";
import { t } from "@/i18n";

export async function submitCommentAction(
  itemId: number,
  text: string
): Promise<{ error?: string; success?: boolean; pending?: boolean }> {
  const session = await getSession();
  if (!session) return { error: t("action.notAuthenticated") };

  const result = await postComment(session, itemId, text);
  if (!result.ok) return { error: result.message };

  revalidatePath(`/publication/${itemId}`);
  revalidatePath(`/discussions/${itemId}`);
  return { success: true, pending: result.pending };
}
