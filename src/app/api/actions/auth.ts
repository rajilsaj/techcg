"use server";

import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth";

/** Sign-in happens with Google (see AUTH.md); this only signs out. */
export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/");
}
