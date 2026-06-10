"use server";

import { revalidatePath } from "next/cache";
import { requireEdit } from "@/lib/auth";
import { referenceRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";

function refresh() {
  revalidatePath("/setup");
  revalidatePath("/fleet");
  revalidatePath("/fleet/leave");
}

export async function createLeaveTypeAction(formData: FormData): Promise<void> {
  const user = await requireEdit();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return;
  await referenceRepo.createLeaveType({
    code,
    name,
    colorHex: String(formData.get("colorHex") ?? "#475569"),
    sortOrder: Number(formData.get("sortOrder") ?? 50) || 50,
  });
  await logAction(user, "setup.leaveTypeCreate", "LeaveType", null, `Added leave type ${code} (${name})`);
  refresh();
}

export async function updateLeaveTypeAction(formData: FormData): Promise<void> {
  const user = await requireEdit();
  const code = String(formData.get("code"));
  await referenceRepo.updateLeaveType(code, {
    name: String(formData.get("name") ?? "").trim(),
    colorHex: String(formData.get("colorHex") ?? "#475569"),
    sortOrder: Number(formData.get("sortOrder") ?? 50) || 50,
  });
  await logAction(user, "setup.leaveTypeUpdate", "LeaveType", null, `Updated leave type ${code}`);
  refresh();
}

export async function toggleLeaveTypeActive(formData: FormData): Promise<void> {
  const user = await requireEdit();
  const code = String(formData.get("code"));
  const active = String(formData.get("active")) === "true";
  await referenceRepo.setLeaveTypeActive(code, active);
  await logAction(user, "setup.leaveTypeToggle", "LeaveType", null, `${active ? "Reactivated" : "Hid"} leave type ${code}`);
  refresh();
}

export async function createHolidayAction(formData: FormData): Promise<void> {
  const user = await requireEdit();
  const date = String(formData.get("date") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name) return;
  const states = String(formData.get("states") ?? "ALL").trim().toUpperCase() || "ALL";
  await referenceRepo.createHoliday({ date, name, states });
  await logAction(user, "setup.holidayCreate", "PublicHoliday", null, `Added public holiday ${name} on ${date} (${states})`);
  refresh();
  revalidatePath("/wallboard/fleet");
}

export async function deleteHolidayAction(formData: FormData): Promise<void> {
  const user = await requireEdit();
  const id = Number(formData.get("id"));
  if (!id) return;
  await referenceRepo.deleteHoliday(id);
  await logAction(user, "setup.holidayDelete", "PublicHoliday", id, `Removed public holiday #${id}`);
  refresh();
  revalidatePath("/wallboard/fleet");
}
