"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";

/** Erases everything recorded for one IP address (e.g. after a deletion request). */
export async function deleteIpDataAction(formData: FormData) {
  const admin = await requireAdminAction();
  const ip = String(formData.get("ip") ?? "").slice(0, 64);
  if (!ip) redirect(withNotice("/godmod/visiteurs", "no-selection"));
  const { count } = await prisma.pageView.deleteMany({ where: { ip } });
  await logActivity(admin.userId, "visitors.delete", `Données de visite de l'IP ${ip} supprimées (${count} pages vues)`, { type: "settings" });
  redirect(withNotice("/godmod/visiteurs", "deleted"));
}
