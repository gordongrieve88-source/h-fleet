"use server";

import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/auth";
import { referenceRepo, complianceRepo, fleetRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";

function refresh() {
  revalidatePath("/setup");
  revalidatePath("/fleet");
  revalidatePath("/fleet/leave");
  revalidatePath("/fleet/compliance");
}

/** Dispatch groups drive the view selector, which sits on every fleet screen. */
function refreshGroups() {
  refresh();
  revalidatePath("/fleet/depots");
  revalidatePath("/fleet/drivers");
  revalidatePath("/fleet/trucks");
  revalidatePath("/fleet/week");
  revalidatePath("/fleet/reports");
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
    states: String(formData.get("states") ?? "ALL").trim().toUpperCase() || "ALL",
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

/** Delete a credential type and every driver's record of holding it. */
export async function deleteCredentialTypeAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return;
  const { name, heldBy } = await complianceRepo.deleteType(code);
  await logAction(
    user,
    "setup.credentialTypeDelete",
    "CredentialType",
    null,
    `Removed credential ${code} (${name})${heldBy > 0 ? ` and ${heldBy} driver record${heldBy === 1 ? "" : "s"}` : ""}`,
  );
  refresh();
  revalidatePath("/fleet/drivers");
}

export async function toggleCredentialTypeActive(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const active = String(formData.get("active")) === "true";
  await complianceRepo.setTypeActive(code, active);
  await logAction(user, "setup.credentialTypeToggle", "CredentialType", null, `${active ? "Reactivated" : "Hid"} credential type ${code}`);
  refresh();
}

// ---- dispatch groups --------------------------------------------------------
// The allocation system's grouping — one per state today (300 SA, 301 NSW,
// 302 QLD, 303 VIC, 304 WA). Depots are assigned to a group on the Depots
// screen; the code is the identity Syncrotess prints, so it can't be edited
// after the fact — add the right one and move the depots across.

export async function createDispatchGroupAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return;
  await fleetRepo.createDispatchGroup({
    code,
    name,
    state: String(formData.get("state") ?? "NSW").trim().toUpperCase() || "NSW",
    sortOrder: Number(formData.get("sortOrder") ?? 50) || 50,
  });
  await logAction(user, "setup.dispatchGroupCreate", "DispatchGroup", null, `Added dispatch group ${code} (${name})`);
  refreshGroups();
}

export async function updateDispatchGroupAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await fleetRepo.updateDispatchGroup(code, {
    name,
    state: String(formData.get("state") ?? "NSW").trim().toUpperCase() || "NSW",
    sortOrder: Number(formData.get("sortOrder") ?? 50) || 50,
  });
  await logAction(user, "setup.dispatchGroupUpdate", "DispatchGroup", null, `Updated dispatch group ${code} (${name})`);
  refreshGroups();
}

export async function toggleDispatchGroupActive(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const active = String(formData.get("active")) === "true";
  await fleetRepo.setDispatchGroupActive(code, active);
  await logAction(
    user,
    "setup.dispatchGroupToggle",
    "DispatchGroup",
    null,
    `${active ? "Reactivated" : "Hid"} dispatch group ${code}`,
  );
  refreshGroups();
}

/** Only reachable for a group with no depots — the repo enforces that too. */
export async function deleteDispatchGroupAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return;
  const group = await fleetRepo.deleteDispatchGroup(code);
  await logAction(user, "setup.dispatchGroupDelete", "DispatchGroup", null, `Removed dispatch group ${code} (${group.name})`);
  refreshGroups();
}

// ---- truck properties -------------------------------------------------------
// The allocation system's tick-box attributes, offered under every truck's
// setup on Fleet → Trucks. The code is what the allocation system prints, so
// it can't be edited after the fact.

function refreshTruckProperties() {
  revalidatePath("/setup");
  revalidatePath("/fleet/trucks");
}

export async function createTruckPropertyAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return;
  await fleetRepo.createTruckProperty(code, name);
  await logAction(user, "setup.truckPropertyCreate", "TruckProperty", null, `Added truck property ${code} (${name})`);
  refreshTruckProperties();
}

export async function updateTruckPropertyAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await fleetRepo.updateTruckProperty(code, { name, sortOrder: Number(formData.get("sortOrder") ?? 50) || 50 });
  await logAction(user, "setup.truckPropertyUpdate", "TruckProperty", null, `Updated truck property ${code} (${name})`);
  refreshTruckProperties();
}

export async function toggleTruckPropertyActive(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const active = String(formData.get("active")) === "true";
  await fleetRepo.setTruckPropertyActive(code, active);
  await logAction(user, "setup.truckPropertyToggle", "TruckProperty", null, `${active ? "Reactivated" : "Hid"} truck property ${code}`);
  refreshTruckProperties();
}

/** Delete a property and every truck's tick of it. */
export async function deleteTruckPropertyAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return;
  const { name, tickedBy } = await fleetRepo.deleteTruckProperty(code);
  await logAction(
    user,
    "setup.truckPropertyDelete",
    "TruckProperty",
    null,
    `Removed truck property ${code} (${name})${tickedBy > 0 ? ` and its tick on ${tickedBy} truck${tickedBy === 1 ? "" : "s"}` : ""}`,
  );
  refreshTruckProperties();
}

// ---- driver profile fields --------------------------------------------------
// The onboarding checklist — the information every driver's profile holds.
// Fields are identity-coded like everything else; the label, section, kind
// and order are the editable parts.

function refreshProfileFields() {
  revalidatePath("/setup");
  revalidatePath("/fleet/drivers");
}

function profileFieldFields(formData: FormData) {
  const kind = ["TEXT", "DATE", "YESNO"].includes(String(formData.get("kind"))) ? String(formData.get("kind")) : "TEXT";
  return {
    label: String(formData.get("label") ?? "").trim(),
    section: String(formData.get("section") ?? "").trim() || "Other",
    kind,
    sortOrder: Number(formData.get("sortOrder") ?? 500) || 500,
  };
}

export async function createProfileFieldAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  const { label, section, kind } = profileFieldFields(formData);
  if (!code || !label) return;
  await fleetRepo.createProfileField({ code, label, section, kind });
  await logAction(user, "setup.profileFieldCreate", "DriverProfileField", null, `Added profile field ${code} (${label}, ${section})`);
  refreshProfileFields();
}

export async function updateProfileFieldAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const fields = profileFieldFields(formData);
  if (!fields.label) return;
  await fleetRepo.updateProfileField(code, fields);
  await logAction(user, "setup.profileFieldUpdate", "DriverProfileField", null, `Updated profile field ${code}`);
  refreshProfileFields();
}

export async function toggleProfileFieldActive(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code"));
  const active = String(formData.get("active")) === "true";
  await fleetRepo.setProfileFieldActive(code, active);
  await logAction(user, "setup.profileFieldToggle", "DriverProfileField", null, `${active ? "Reactivated" : "Hid"} profile field ${code}`);
  refreshProfileFields();
}

/** Delete a checklist field and every driver's answer to it. */
export async function deleteProfileFieldAction(formData: FormData): Promise<void> {
  const user = await requireManager();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return;
  const { label, answers } = await fleetRepo.deleteProfileField(code);
  await logAction(
    user,
    "setup.profileFieldDelete",
    "DriverProfileField",
    null,
    `Removed profile field ${code} (${label})${answers > 0 ? ` and ${answers} driver answer${answers === 1 ? "" : "s"}` : ""}`,
  );
  refreshProfileFields();
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
