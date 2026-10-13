"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { sanitizeSettings, saveSettings } from "@/lib/settings";

export async function saveSettingsAction(formData: FormData) {
  const admin = await requireAdminAction();
  const categoryId = parseInt(String(formData.get("defaultCategoryId") ?? ""), 10);
  const retention = parseInt(String(formData.get("analyticsRetentionDays") ?? ""), 10);

  await saveSettings(
    sanitizeSettings({
      siteName: formData.get("siteName"),
      siteDescription: formData.get("siteDescription"),
      commentModeration: formData.get("commentModeration"),
      submissionsOpen: formData.get("submissionsOpen") === "on",
      defaultCategoryId: Number.isInteger(categoryId) ? categoryId : null,
      analyticsRetentionDays: retention,
    })
  );

  await logActivity(admin.userId, "settings.update", "Réglages du site modifiés", { type: "settings" });
  revalidatePath("/", "layout");
  redirect(withNotice("/godmod/parametres", "saved"));
}
