"use server";

import { revalidatePath } from "next/cache";
import { requireEdit, requireEditForDepot, requireUnrestrictedEdit } from "@/lib/auth";
import { fleetBoardRepo, fleetRepo, complianceRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { dateFromKey, parseYmdOrNull, fmtDate } from "@/lib/wfm/date";
import { statusLabel } from "@/lib/wfm/fleet";
import type { AppUser } from "@/generated/prisma/client";

export type ActionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/fleet");
  revalidatePath("/");
}

function badDate(): ActionResult {
  return { ok: false, error: "Invalid date." };
}

/** Edits to a truck's board row are scoped by the truck's home depot. */
async function requireEditForTruck(truckId: string, user: AppUser) {
  const truck = await fleetRepo.getTruck(truckId);
  if (!truck) throw new Error("Unknown truck.");
  await requireEditForDepot(truck.depotId, user);
  return truck;
}

/** Move/swap a driver onto a truck. The saved day decides the real source
 *  truck — the client's view may be stale — and the whole move is one
 *  transaction, so concurrent edits can't double-assign a driver. */
export async function moveDriver(dateKey: string, driverId: number, toTruck: string): Promise<ActionResult> {
  const user = await requireEdit();
  if (!parseYmdOrNull(dateKey)) return badDate();
  try {
    const truck = await requireEditForTruck(toTruck, user);
    const date = dateFromKey(dateKey);

    // Gate 1 — a credential that BLOCKS rostering and is expired on the
    // board's date refuses the move (the Fleet doctor explains why).
    const blocked = await complianceRepo.expiredBlocking(driverId, date);
    if (blocked.length > 0) {
      const driver = await fleetRepo.getDriver(driverId);
      const c = blocked[0];
      return {
        ok: false,
        error: `Can't roster ${driver?.name ?? `#${driverId}`}: ${c.type.name} expired ${fmtDate(c.expiresOn!)}.`,
      };
    }

    // Gate 2 — can they drive this kind of truck? A competency marked as
    // required for the truck's type must be held.
    const missing = await complianceRepo.missingForTruckType(driverId, truck.type);
    if (missing.length > 0) {
      const driver = await fleetRepo.getDriver(driverId);
      const article = /^[aeiou]/i.test(truck.type) ? "an" : "a";
      return {
        ok: false,
        error: `Can't roster ${driver?.name ?? `#${driverId}`} on ${article} ${truck.type}: not signed off for ${missing.map((m) => m.name).join(", ")}.`,
      };
    }

    const { from, displaced } = await fleetBoardRepo.moveDriver(date, driverId, toTruck, user.id);

    const driver = await fleetRepo.getDriver(driverId);
    const what =
      from == null
        ? `${driver?.name ?? `#${driverId}`} → ${toTruck}`
        : displaced != null
          ? `${driver?.name ?? `#${driverId}`} ⇄ ${toTruck} (swap with ${from})`
          : `${driver?.name ?? `#${driverId}`} ${from} → ${toTruck}`;
    await logAction(user, "fleet.move", "TruckAssignment", null, `${what} on ${fmtDate(date)}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}

export async function setTruckStatus(dateKey: string, truckId: string, status: string): Promise<ActionResult> {
  const user = await requireEdit();
  if (!parseYmdOrNull(dateKey)) return badDate();
  try {
    await requireEditForTruck(truckId, user);
    const date = dateFromKey(dateKey);
    await fleetBoardRepo.applyChanges(date, [{ truckId, status }], user.id);
    await logAction(user, "fleet.status", "TruckAssignment", null, `${truckId} → ${status} (${statusLabel(status)}) on ${fmtDate(date)}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}

export async function clearTruckDriver(dateKey: string, truckId: string): Promise<ActionResult> {
  const user = await requireEdit();
  if (!parseYmdOrNull(dateKey)) return badDate();
  try {
    await requireEditForTruck(truckId, user);
    const date = dateFromKey(dateKey);
    await fleetBoardRepo.applyChanges(date, [{ truckId, driverId: null }], user.id);
    await logAction(user, "fleet.clear", "TruckAssignment", null, `Cleared driver off ${truckId} on ${fmtDate(date)}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}

/** Discard a day's edits — the board reverts to the roll-forward default.
 *  Sweeps every depot at once, so depot-scoped supervisors can't use it. */
export async function resetBoardDay(dateKey: string): Promise<ActionResult> {
  const user = await requireUnrestrictedEdit();
  if (!parseYmdOrNull(dateKey)) return badDate();
  try {
    const date = dateFromKey(dateKey);
    await fleetBoardRepo.resetDay(date);
    await logAction(user, "fleet.reset", "TruckAssignment", null, `Reset the board for ${fmtDate(date)} to roll-forward defaults`);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}
