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

/** Shared shape for both credential-type forms. */
function credentialTypeFields(formData: FormData) {
  const kind = String(formData.get("kind")) === "TICKBOX" ? "TICKBOX" : "EXPIRY";
  const truckType = String(formData.get("requiredForTruckType") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    kind,
    category: String(formData.get("category") ?? "").trim() || "Tickets & medicals",
    severity: String(formData.get("severity")) === "BLOCK" ? "BLOCK" : "WARN",
    warnDays: Math.max(0, Number(formData.get("warnDays") ?? 30) || 30),
    // Only a tick-box competency can gate a truck type.
    requiredForTruckType: kind === "TICKBOX" && truckType ? truckType : null,
    sortOrder: Number(formData.get("sortOrder") ?? 50) || 50,
  };
}

export async function createCredentialTypeAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const fields = credentialTypeFields(formData);
  if (!code || !fields.name) return;
  await complianceRepo.createType({ code, ...fields });
  await logAction(
    user,
    "setup.credentialTypeCreate",
    "CredentialType",
    null,
    `Added ${fields.kind === "TICKBOX" ? "competency" : "credential type"} ${code} (${fields.name}, ${fields.category})`,
  );
  refresh();
}

export async function updateCredentialTypeAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const fields = credentialTypeFields(formData);
  await complianceRepo.updateType(code, fields);
  await logAction(user, "setup.credentialTypeUpdate", "CredentialType", null, `Updated credential type ${code}`);
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
