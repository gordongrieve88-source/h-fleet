"use server";

import { revalidatePath } from "next/cache";
import { requireEdit, requireEditForDepot, requireManager } from "@/lib/auth";
import { fleetRepo, selfServiceRepo, complianceRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";

export type ActionResult = { ok: boolean; error?: string };

function fail(e: unknown): ActionResult {
  const msg = String(e);
  if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
    return { ok: false, error: "That code/name is already used." };
  }
  return { ok: false, error: msg.replace(/^Error:\s*/, "").slice(0, 160) };
}

function refresh() {
  // Master data feeds every fleet screen.
  revalidatePath("/fleet");
  revalidatePath("/fleet/leave");
  revalidatePath("/fleet/drivers");
  revalidatePath("/fleet/trucks");
  revalidatePath("/fleet/depots");
  revalidatePath("/fleet/reports");
  revalidatePath("/me");
}

// ---- drivers ----------------------------------------------------------------
export async function saveDriver(input: {
  id?: number;
  employeeNo: string;
  name: string;
  depotId: number;
  workgroup: string;
  /** Sign-in account for self-service: id, or null to unlink. Omit to leave as-is. */
  appUserId?: number | null;
}): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    if (!input.name.trim() || !input.employeeNo.trim()) return { ok: false, error: "Name and employee number are required." };
    const data = { employeeNo: input.employeeNo.trim(), name: input.name.trim(), depotId: input.depotId, workgroup: input.workgroup.trim() };
    await requireEditForDepot(input.depotId, user); // the depot the driver will belong to
    let driverId = input.id;
    if (input.id) {
      const current = await fleetRepo.getDriver(input.id);
      if (current) await requireEditForDepot(current.depotId, user); // and the one they leave
      await fleetRepo.updateDriver(input.id, data);
      await logAction(user, "fleet.driver.update", "Driver", input.id, `Updated driver ${data.name} (#${data.employeeNo})`);
    } else {
      const row = await fleetRepo.createDriver(data);
      driverId = row.id;
      await logAction(user, "fleet.driver.create", "Driver", row.id, `Added driver ${data.name} (#${data.employeeNo})`);
    }
    if (input.appUserId !== undefined && driverId) {
      const linked = await selfServiceRepo.setDriverAccount(driverId, input.appUserId);
      await logAction(
        user,
        "fleet.driver.link",
        "Driver",
        driverId,
        input.appUserId
          ? `Linked ${data.name} to sign-in ${linked.appUser?.displayName ?? `#${input.appUserId}`} for self-service`
          : `Unlinked ${data.name} from self-service sign-in`,
      );
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** The driver's qualifications for their profile: every active type, and
 *  whether they hold it. */
export async function loadDriverQualifications(driverId: number) {
  await requireEdit();
  return complianceRepo.profileFor(driverId);
}

/** Tick or untick one competency on a driver's profile. */
export async function setDriverCompetency(driverId: number, typeCode: string, held: boolean): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    const driver = await fleetRepo.getDriver(driverId);
    if (!driver) return { ok: false, error: "Unknown driver." };
    await requireEditForDepot(driver.depotId, user);
    await complianceRepo.setTickbox(driverId, typeCode, held);
    const type = (await complianceRepo.listTypes()).find((t) => t.code === typeCode);
    await logAction(
      user,
      "fleet.driver.competency",
      "DriverCredential",
      driverId,
      `${held ? "Signed off" : "Removed sign-off for"} ${driver.name} — ${type?.name ?? typeCode}`,
    );
    revalidatePath("/fleet/drivers");
    revalidatePath("/fleet/compliance");
    revalidatePath("/fleet");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setDriverActive(id: number, isActive: boolean): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    const current = await fleetRepo.getDriver(id);
    if (current) await requireEditForDepot(current.depotId, user);
    const row = await fleetRepo.setDriverActive(id, isActive);
    await logAction(user, "fleet.driver.active", "Driver", id, `${isActive ? "Reactivated" : "Deactivated"} driver ${row.name}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- trucks -------------------------------------------------------------------
export async function saveTruck(input: {
  id: string;
  isNew: boolean;
  depotId: number;
  region: string;
  block: string;
  type: string;
  rosterGroup: number;
  defaultDriverId: number | null;
}): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    if (!input.id.trim()) return { ok: false, error: "Fleet code is required." };
    const id = input.id.trim().toUpperCase();
    const data = {
      depotId: input.depotId,
      region: input.region,
      block: input.block.trim(),
      type: input.type.trim() || "Agitator",
      // The fleet's norm is roster group 2 — nonsense values fall back to it.
      rosterGroup: Number.isInteger(input.rosterGroup) && input.rosterGroup >= 1 && input.rosterGroup <= 3 ? input.rosterGroup : 2,
      defaultDriverId: input.defaultDriverId,
    };
    await requireEditForDepot(input.depotId, user); // the depot the truck will belong to
    if (input.isNew) {
      await fleetRepo.createTruck({ id, ...data });
      await logAction(user, "fleet.truck.create", "Truck", null, `Added truck ${id} (${data.block})`);
    } else {
      const current = await fleetRepo.getTruck(id);
      if (current) await requireEditForDepot(current.depotId, user); // and the one it leaves
      await fleetRepo.updateTruck(id, data);
      await logAction(user, "fleet.truck.update", "Truck", null, `Updated truck ${id} (${data.block})`);
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setTruckActive(id: string, isActive: boolean): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    const current = await fleetRepo.getTruck(id);
    if (current) await requireEditForDepot(current.depotId, user);
    await fleetRepo.setTruckActive(id, isActive);
    await logAction(user, "fleet.truck.active", "Truck", null, `${isActive ? "Reactivated" : "Deactivated"} truck ${id}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Free-text detail on a held tick box (card number, cert year, booked date). */
export async function setCompetencyDetail(driverId: number, typeCode: string, reference: string): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    const driver = await fleetRepo.getDriver(driverId);
    if (!driver) return { ok: false, error: "Unknown driver." };
    await requireEditForDepot(driver.depotId, user);
    await complianceRepo.setTickboxDetail(driverId, typeCode, reference);
    await logAction(user, "fleet.driver.competency", "DriverCredential", driverId, `Noted ${typeCode} detail for ${driver.name}`);
    revalidatePath("/fleet/drivers");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- driver profile (onboarding checklist) ----------------------------------
/**
 * Save one section of a driver's profile page. The form posts every field of
 * the section: a YESNO checkbox is only present when ticked, so absence
 * clears it; an emptied text/date input clears too.
 */
export async function saveDriverProfileSection(formData: FormData): Promise<void> {
  const user = await requireEdit();
  const driverId = Number(formData.get("driverId"));
  const section = String(formData.get("section") ?? "");
  const driver = await fleetRepo.getDriver(driverId);
  if (!driver) return;
  await requireEditForDepot(driver.depotId, user);

  const fields = (await fleetRepo.driverProfile(driverId)).filter((f) => f.section === section);
  const entries = fields.map((f) => {
    const raw = formData.get(f.code);
    const value = f.kind === "YESNO" ? (raw ? "yes" : "") : String(raw ?? "").trim();
    return { fieldCode: f.code, value };
  });
  await fleetRepo.saveDriverProfileValues(driverId, entries);
  await logAction(user, "fleet.driver.profile", "Driver", driverId, `Updated ${section} on ${driver.name}'s profile`);
  revalidatePath(`/fleet/drivers/${driverId}`);
  revalidatePath("/fleet/drivers");
}

// ---- truck properties -------------------------------------------------------
/** The property panel for one truck's edit dialog. */
export async function loadTruckProperties(truckId: string) {
  await requireEdit();
  return fleetRepo.truckProperties(truckId);
}

/** Tick or untick one property on a truck. */
export async function setTruckProperty(truckId: string, propertyCode: string, held: boolean): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    const truck = await fleetRepo.getTruck(truckId);
    if (!truck) return { ok: false, error: "Unknown truck." };
    await requireEditForDepot(truck.depotId, user);
    await fleetRepo.setTruckProperty(truckId, propertyCode, held);
    await logAction(
      user,
      "fleet.truck.property",
      "TruckProperty",
      null,
      `${held ? "Ticked" : "Unticked"} ${propertyCode} on truck ${truckId}`,
    );
    revalidatePath("/fleet/trucks");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- depots (org structure — managers only) ---------------------------------
export async function saveDepot(input: {
  id?: number;
  name: string;
  regionName: string;
  state?: string;
  dispatchGroupCode?: string | null;
}): Promise<ActionResult> {
  const user = await requireManager();
  try {
    if (!input.name.trim() || !input.regionName) return { ok: false, error: "Name and region are required." };
    const state = (input.state ?? "NSW").trim().toUpperCase() || "NSW";
    if (input.id) {
      await fleetRepo.updateDepot(input.id, { name: input.name.trim(), regionName: input.regionName, state, dispatchGroupCode: input.dispatchGroupCode ?? null });
      await logAction(user, "fleet.depot.update", "Depot", input.id, `Updated depot ${input.name.trim()} (${input.regionName}, ${state})`);
    } else {
      const row = await fleetRepo.createDepot({ name: input.name.trim(), regionName: input.regionName, state, dispatchGroupCode: input.dispatchGroupCode ?? null });
      await logAction(user, "fleet.depot.create", "Depot", row.id, `Added depot ${row.name} (${input.regionName}, ${state})`);
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setDepotActive(id: number, isActive: boolean): Promise<ActionResult> {
  const user = await requireManager();
  try {
    const row = await fleetRepo.setDepotActive(id, isActive);
    await logAction(user, "fleet.depot.active", "Depot", id, `${isActive ? "Reactivated" : "Deactivated"} depot ${row.name}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- regions (org structure — managers only) --------------------------------
export async function createFleetRegion(name: string, dispatchGroupCode: string | null = null): Promise<ActionResult> {
  const user = await requireManager();
  try {
    if (!name.trim()) return { ok: false, error: "Region name is required." };
    await fleetRepo.createRegion(name.trim(), dispatchGroupCode || null);
    await logAction(
      user,
      "fleet.region.create",
      "FleetRegion",
      null,
      `Added fleet region ${name.trim()}${dispatchGroupCode ? ` (group ${dispatchGroupCode})` : ""}`,
    );
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setFleetRegionActive(name: string, isActive: boolean): Promise<ActionResult> {
  const user = await requireManager();
  try {
    await fleetRepo.setRegionActive(name, isActive);
    await logAction(user, "fleet.region.active", "FleetRegion", null, `${isActive ? "Reactivated" : "Deactivated"} fleet region ${name}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
