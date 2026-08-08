"use server";

import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/auth";
import { referenceRepo, complianceRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";

function refresh() {
  revalidatePath("/setup");
  revalidatePath("/fleet");
  revalidatePath("/fleet/leave");
  revalidatePath("/fleet/compliance");
}

export async function createLeaveTypeAction(formData: FormData): Promise<void> {
  const user = await requireManager();
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
  const user = await requireManager();
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
  const user = await requireManager();
  const code = String(formData.get("code"));
  const active = String(formData.get("active")) === "true";
  await referenceRepo.setLeaveTypeActive(code, active);
  await logAction(user, "setup.leaveTypeToggle", "LeaveType", null, `${active ? "Reactivated" : "Hid"} leave type ${code}`);
  refresh();
}

export async function createCredentialTypeAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return;
  const severity = String(formData.get("severity")) === "BLOCK" ? "BLOCK" : "WARN";
  await complianceRepo.createType({
    code,
    name,
    severity,
    warnDays: Math.max(0, Number(formData.get("warnDays") ?? 30) || 30),
    sortOrder: Number(formData.get("sortOrder") ?? 50) || 50,
  });
  await logAction(user, "setup.credentialTypeCreate", "CredentialType", null, `Added credential type ${code} (${name}, ${severity})`);
  refresh();
}

export async function updateCredentialTypeAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const severity = String(formData.get("severity")) === "BLOCK" ? "BLOCK" : "WARN";
  await complianceRepo.updateType(code, {
    name: String(formData.get("name") ?? "").trim(),
    severity,
    warnDays: Math.max(0, Number(formData.get("warnDays") ?? 30) || 30),
    sortOrder: Number(formData.get("sortOrder") ?? 50) || 50,
  });
  await logAction(user, "setup.credentialTypeUpdate", "CredentialType", null, `Updated credential type ${code} (${severity})`);
  refresh();
}

export async function toggleCredentialTypeActive(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const active = String(formData.get("active")) === "true";
  await complianceRepo.setTypeActive(code, active);
  await logAction(user, "setup.credentialTypeToggle", "CredentialType", null, `${active ? "Reactivated" : "Hid"} credential type ${code}`);
  refresh();
}

export async function createHolidayAction(formData: FormData): Promise<void> {
  const user = await requireManager();
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
  const user = await requireManager();
  const id = Number(formData.get("id"));
  if (!id) return;
  await referenceRepo.deleteHoliday(id);
  await logAction(user, "setup.holidayDelete", "PublicHoliday", id, `Removed public holiday #${id}`);
  refresh();
  revalidatePath("/wallboard/fleet");
}
