"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { VIEW_GROUP_COOKIE } from "./view-group";

/** Switch which dispatch group the app is showing (a view filter only). */
export async function setViewGroup(code: string): Promise<void> {
  const value = code.trim().toUpperCase() || "ALL";
  const store = await cookies();
  store.set(VIEW_GROUP_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
