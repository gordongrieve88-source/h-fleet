"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_USER_COOKIE } from "./index";

/**
 * Demo-only: switch which seeded user is "signed in". Deleted in production —
 * identity comes from Entra ID, not a switcher.
 */
export async function setDemoUser(userId: number) {
  if (userId) {
    const store = await cookies();
    store.set(DEMO_USER_COOKIE, String(userId), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  revalidatePath("/", "layout");
}
