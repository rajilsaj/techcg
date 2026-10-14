"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { getSettings, sanitizeSettings, saveSettings } from "@/lib/settings";

/** Saves which sections appear in the main menu (ticked boxes named "menu"). */
export async function saveMenuAction(formData: FormData) {
  const admin = await requireAdminAction();
  const current = await getSettings();
  await saveSettings(sanitizeSettings({ ...current, visibleMenus: formData.getAll("menu") }));
  await logActivity(admin.userId, "settings.update", "Menu principal modifié", { type: "settings" });
  revalidatePath("/", "layout");
  redirect(withNotice("/godmod/menu", "saved"));
}
