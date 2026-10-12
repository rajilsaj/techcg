"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { backTo, requireAdminAction, withNotice } from "@/lib/admin";
import { logActivity } from "@/lib/activity";

const ROW_ACTIONS = {
  promote: { data: { isAdmin: true }, label: "promu administrateur" },
  demote: { data: { isAdmin: false }, label: "retiré des administrateurs" },
  ban: { data: { banned: true }, label: "suspendu" },
  unban: { data: { banned: false }, label: "réactivé" },
  shadow: { data: { shadowBanned: true }, label: "masqué (shadow-ban)" },
  unshadow: { data: { shadowBanned: false }, label: "démasqué" },
  delete: { data: null, label: "supprimé avec son contenu" },
} as const;

/** Row actions on the users list; the button sends "row" = "ban:12". */
export async function userAction(formData: FormData) {
  const admin = await requireAdminAction();
  const back = backTo(formData, "/godmod/utilisateurs");
  const [name, rawId] = String(formData.get("row") ?? "").split(":");
  const id = parseInt(rawId, 10);
  const action = ROW_ACTIONS[name as keyof typeof ROW_ACTIONS];
  if (!action || !Number.isInteger(id)) redirect(withNotice(back, "no-selection"));

  // Admins can't lock themselves out.
  if (id === admin.userId && ["demote", "ban", "delete"].includes(name)) redirect(withNotice(back, "self-protect"));

  const user = await prisma.user.findUnique({ where: { id }, select: { username: true, isAdmin: true } });
  if (!user) redirect(withNotice(back, "no-selection"));

  if (user.isAdmin && ["demote", "ban", "delete"].includes(name)) {
    const admins = await prisma.user.count({ where: { isAdmin: true, banned: false } });
    if (admins <= 1) redirect(withNotice(back, "last-admin"));
  }

  if (action.data) {
    await prisma.user.update({ where: { id }, data: action.data });
  } else {
    await prisma.user.delete({ where: { id } }); // cascades to their articles, comments and votes
  }

  await logActivity(admin.userId, `users.${name}`, `${user.username} ${action.label}`, { type: "user", id });
  revalidatePath("/", "layout");
  redirect(withNotice(name === "delete" ? "/godmod/utilisateurs" : back, name === "delete" ? "deleted" : "updated"));
}

/** Saves the profile fields from the user edit screen. */
export async function updateUserAction(formData: FormData) {
  const admin = await requireAdminAction();
  const id = parseInt(String(formData.get("id")), 10);
  const text = (name: string, max: number) => {
    const value = String(formData.get(name) ?? "").trim();
    return value ? value.slice(0, max) : null;
  };
  const karma = parseInt(String(formData.get("karma") ?? ""), 10);

  const user = await prisma.user.update({
    where: { id },
    data: {
      email: text("email", 200),
      about: text("about", 2000),
      ...(Number.isInteger(karma) ? { karma } : {}),
    },
    select: { username: true },
  });

  await logActivity(admin.userId, "users.update", `Profil de ${user.username} modifié`, { type: "user", id });
  revalidatePath(`/profil/${user.username}`);
  redirect(withNotice(`/godmod/utilisateurs/${id}`, "saved"));
}
