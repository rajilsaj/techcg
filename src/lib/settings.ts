import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { SITE } from "./site";
import { t } from "@/i18n";
import { DEFAULT_VISIBLE_MENUS, isMenuId, type MenuId } from "./menu";

/** Who must wait for an admin before their comment appears. */
export type CommentModeration = "none" | "first" | "all";

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  /** "none": all comments appear; "first": a member's first comment waits; "all": every comment waits. */
  commentModeration: CommentModeration;
  /** When false, the public "Publier" form is closed. */
  submissionsOpen: boolean;
  /** Category given to new posts that don't pick one. */
  defaultCategoryId: number | null;
  /** Visit data (IPs, locations…) older than this many days is deleted. */
  analyticsRetentionDays: number;
  /** Sections shown in the main menu (see MENU_ITEMS); the others stay reachable by their address. */
  visibleMenus: MenuId[];
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: SITE.name,
  siteDescription: t("site.description"),
  commentModeration: "none",
  submissionsOpen: true,
  defaultCategoryId: null,
  analyticsRetentionDays: 90,
  visibleMenus: DEFAULT_VISIBLE_MENUS,
};

const MODERATION_VALUES: CommentModeration[] = ["none", "first", "all"];

/** Keeps only well-formed values; anything else falls back to the default. */
export function sanitizeSettings(raw: Record<string, unknown>): SiteSettings {
  const text = (value: unknown, fallback: string, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
  return {
    siteName: text(raw.siteName, DEFAULT_SETTINGS.siteName, 60),
    siteDescription: text(raw.siteDescription, DEFAULT_SETTINGS.siteDescription, 300),
    commentModeration: MODERATION_VALUES.includes(raw.commentModeration as CommentModeration)
      ? (raw.commentModeration as CommentModeration)
      : DEFAULT_SETTINGS.commentModeration,
    submissionsOpen: typeof raw.submissionsOpen === "boolean" ? raw.submissionsOpen : DEFAULT_SETTINGS.submissionsOpen,
    defaultCategoryId:
      typeof raw.defaultCategoryId === "number" && Number.isInteger(raw.defaultCategoryId) ? raw.defaultCategoryId : null,
    analyticsRetentionDays:
      typeof raw.analyticsRetentionDays === "number" && Number.isInteger(raw.analyticsRetentionDays) && raw.analyticsRetentionDays >= 1 && raw.analyticsRetentionDays <= 730
        ? raw.analyticsRetentionDays
        : DEFAULT_SETTINGS.analyticsRetentionDays,
    visibleMenus: Array.isArray(raw.visibleMenus) ? [...new Set(raw.visibleMenus.filter(isMenuId))] : DEFAULT_SETTINGS.visibleMenus,
  };
}

/** Current settings, read once per request. Falls back to defaults if the database is unreachable. */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await prisma.setting.findMany();
    return sanitizeSettings(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export async function saveSettings(settings: SiteSettings): Promise<void> {
  const clean = sanitizeSettings({ ...settings });
  await prisma.$transaction(
    Object.entries(clean).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: value as Prisma.InputJsonValue },
        update: { value: value as Prisma.InputJsonValue },
      })
    )
  );
}
