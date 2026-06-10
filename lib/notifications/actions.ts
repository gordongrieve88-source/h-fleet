"use server";

import { getCurrentUser } from "@/lib/auth";
import { notificationRepo } from "@/lib/db/repositories";
import { revalidatePath } from "next/cache";

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await notificationRepo.markAllRead(user.id);
  revalidatePath("/", "layout");
}
