import { prisma } from "./db";

export interface ActivityTarget {
  type: "item" | "comment" | "user" | "category" | "tag" | "media" | "settings" | "profile";
  id?: number;
}

/** Records an admin action for the activity log. Never throws: logging must not break the action. */
export async function logActivity(actorId: number, action: string, summary: string, target?: ActivityTarget) {
  try {
    await prisma.activityLog.create({
      data: { actorId, action, summary: summary.slice(0, 500), targetType: target?.type, targetId: target?.id },
    });
  } catch (err) {
    console.error("[activity] failed to log", action, err);
  }
}
