"use server";

import { getSession } from "@/lib/auth";
import { publishStory } from "@/lib/publish";
import { t } from "@/i18n";

export async function submitStoryAction(
  type: string,
  title: string,
  url: string,
  text: string,
  categoryId?: number | null,
  tags?: string
): Promise<{ error?: string; success?: boolean; itemId?: number }> {
  const session = await getSession();
  if (!session) return { error: t("action.notAuthenticated") };

  const result = await publishStory(session, { type, title, url, text, categoryId, tags });
  return result.ok ? { success: true, itemId: result.itemId } : { error: result.message };
}
