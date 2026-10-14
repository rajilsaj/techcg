"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { findDuplicateGroups, mergeGroup } from "@/lib/duplicates-merge";

const PAGE = "/godmod/articles/doublons";

/** "Fusionner" one group (value = id of the copy kept) or every group ("all"). Groups are recomputed here. */
export async function mergeDuplicatesAction(formData: FormData) {
  const admin = await requireAdminAction();
  const target = String(formData.get("merge") ?? "");
  const groups = await findDuplicateGroups();
  const chosen = target === "all" ? groups : groups.filter((g) => String(g[0].id) === target);

  let trashed = 0;
  for (const group of chosen) {
    const result = await mergeGroup(group);
    if (result.trashed.length === 0) continue;
    trashed += result.trashed.length;
    await logActivity(
      admin.userId,
      "item.merge",
      `Doublons fusionnés : #${group[0].id} gardé, ${result.trashed.map((id) => `#${id}`).join(", ")} mis à la corbeille`,
      { type: "item", id: group[0].id }
    );
  }

  if (trashed > 0) revalidatePath("/", "layout");
  redirect(withNotice(PAGE, trashed > 0 ? "merged" : "merge-none"));
}
