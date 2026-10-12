import type { Prisma } from "@prisma/client";

/**
 * Publication workflow for stories and comments.
 * - published: visible to everyone
 * - draft:     set aside by an admin, not visible
 * - pending:   awaiting admin approval (e.g. comments under moderation)
 * - scheduled: becomes visible on its own once `publishAt` has passed
 * - spam:      hidden, marked as spam (comments)
 * - trash:     hidden, can be restored or deleted for good
 */
export const ITEM_STATUSES = ["published", "draft", "pending", "scheduled", "spam", "trash"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export function isItemStatus(value: unknown): value is ItemStatus {
  return typeof value === "string" && (ITEM_STATUSES as readonly string[]).includes(value);
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  published: "Publié",
  draft: "Brouillon",
  pending: "En attente",
  scheduled: "Programmé",
  spam: "Indésirable",
  trash: "Corbeille",
};

/** Plural forms for list tabs ("Publiés (12)"). */
export const STATUS_TAB_LABELS: Record<ItemStatus, string> = {
  published: "Publiés",
  draft: "Brouillons",
  pending: "En attente",
  scheduled: "Programmés",
  spam: "Indésirables",
  trash: "Corbeille",
};

/** Items the public may see: published, or scheduled with a publish date in the past. */
export function publiclyVisible(now = new Date()): Prisma.ItemWhereInput {
  return { OR: [{ status: "published" }, { status: "scheduled", publishAt: { lte: now } }] };
}

/** Whether a single item is visible to the public right now. */
export function isPubliclyVisible(item: { status: string; publishAt: Date | null }, now = new Date()): boolean {
  return item.status === "published" || (item.status === "scheduled" && !!item.publishAt && item.publishAt <= now);
}
