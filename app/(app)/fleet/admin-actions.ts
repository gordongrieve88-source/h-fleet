"use server";

import { revalidatePath } from "next/cache";
import { requireEdit, requireEditForDepot, requireManager } from "@/lib/auth";
import { fleetRepo } from "@/lib/db/repositories";
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
}

// ---- drivers ----------------------------------------------------------------
export async function saveDriver(input: {
  id?: number;
  employeeNo: string;
  name: string;
  depotId: number;
  workgroup: string;
}): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    if (!input.name.trim() || !input.employeeNo.trim()) return { ok: false, error: "Name and employee number are required." };
    const data = { employeeNo: input.employeeNo.trim(), name: input.name.trim(), depotId: input.depotId, workgroup: input.workgroup.trim() };
    await requireEditForDepot(input.depotId, user); // the depot the driver will belong to
    if (input.id) {
      const current = await fleetRepo.getDriver(input.id);
      if (current) await requireEditForDepot(current.depotId, user); // and the one they leave
      await fleetRepo.updateDriver(input.id, data);
      await logAction(user, "fleet.driver.update", "Driver", input.id, `Updated driver ${data.name} (#${data.employeeNo})`);
    } else {
      const row = await fleetRepo.createDriver(data);
      await logAction(user, "fleet.driver.create", "Driver", row.id, `Added driver ${data.name} (#${data.employeeNo})`);
    }
    refresh();
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

// ---- depots (org structure — managers only) ---------------------------------
export async function saveDepot(input: { id?: number; name: string; regionName: string }): Promise<ActionResult> {
  const user = await requireManager();
  try {
    if (!input.name.trim() || !input.regionName) return { ok: false, error: "Name and region are required." };
    if (input.id) {
      await fleetRepo.updateDepot(input.id, { name: input.name.trim(), regionName: input.regionName });
      await logAction(user, "fleet.depot.update", "Depot", input.id, `Updated depot ${input.name.trim()} (${input.regionName})`);
    } else {
      const row = await fleetRepo.createDepot({ name: input.name.trim(), regionName: input.regionName });
      await logAction(user, "fleet.depot.create", "Depot", row.id, `Added depot ${row.name} (${input.regionName})`);
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
export async function createFleetRegion(name: string): Promise<ActionResult> {
  const user = await requireManager();
  try {
    if (!name.trim()) return { ok: false, error: "Region name is required." };
    await fleetRepo.createRegion(name.trim());
    await logAction(user, "fleet.region.create", "FleetRegion", null, `Added fleet region ${name.trim()}`);
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
