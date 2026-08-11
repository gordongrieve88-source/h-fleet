"use server";

import { revalidatePath } from "next/cache";
import { requireEdit, requireEditForDepot, requireUnrestrictedEdit } from "@/lib/auth";
import { fleetBoardRepo, fleetRepo, complianceRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { dateFromKey, parseYmdOrNull, fmtDate } from "@/lib/wfm/date";
import { statusLabel, TRUCK_STATUS, TIMED_STATUS } from "@/lib/wfm/fleet";
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
  if (!(status.toUpperCase() in TRUCK_STATUS)) return { ok: false, error: "Unknown status." };
  try {
    await requireEditForTruck(truckId, user);
    const date = dateFromKey(dateKey);
    const { clearedDriver, futureDaysPlanned } = await fleetBoardRepo.setStatus(date, truckId, status, user.id);
    const extras = [
      clearedDriver != null ? "driver released to spares" : null,
      futureDaysPlanned > 0
        ? status === "OFF-BD"
          ? `planned off ${futureDaysPlanned} saved day${futureDaysPlanned === 1 ? "" : "s"} ahead`
          : `released ${futureDaysPlanned} saved day${futureDaysPlanned === 1 ? "" : "s"} ahead`
        : null,
    ].filter(Boolean);
    await logAction(
      user,
      "fleet.status",
      "TruckAssignment",
      null,
      `${truckId} → ${status} (${statusLabel(status)}) on ${fmtDate(date)}${extras.length ? ` — ${extras.join(", ")}` : ""}`,
    );
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}

/**
 * One status for several trucks at once (bulk-select on the board) — e.g.
 * half the plant on early finish. Runs the same per-truck cascade as a
 * single change (driver release, breakdown planning, FTO reseating), plus
 * the shared planned time when the status is a timed one.
 */
export async function setTruckStatusBulk(
  dateKey: string,
  truckIds: string[],
  status: string,
  statusTime?: string,
): Promise<ActionResult> {
  const user = await requireEdit();
  if (!parseYmdOrNull(dateKey)) return badDate();
  if (!(status.toUpperCase() in TRUCK_STATUS)) return { ok: false, error: "Unknown status." };
  const ids = [...new Set(truckIds)].slice(0, 200);
  if (ids.length === 0) return { ok: false, error: "No trucks selected." };
  const clean = (statusTime ?? "").trim();
  if (clean && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(clean)) return { ok: false, error: "Time must be HH:MM." };
  try {
    const date = dateFromKey(dateKey);
    for (const truckId of ids) await requireEditForTruck(truckId, user);
    let released = 0;
    for (const truckId of ids) {
      const { clearedDriver } = await fleetBoardRepo.setStatus(date, truckId, status, user.id);
      if (clearedDriver != null) released++;
      if (clean && status.toUpperCase() in TIMED_STATUS) {
        await fleetBoardRepo.applyChanges(date, [{ truckId, statusTime: clean }], user.id);
      }
    }
    await logAction(
      user,
      "fleet.status",
      "TruckAssignment",
      null,
      `${ids.join(", ")} → ${status} (${statusLabel(status)})${clean ? ` at ${clean}` : ""} on ${fmtDate(date)}` +
        `${released ? ` — ${released} driver${released === 1 ? "" : "s"} released to spares` : ""}`,
    );
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}

/** Hand first-truck-out to a specific truck — the dispatcher's override of the cycle. */
export async function setFirstTruckOut(dateKey: string, truckId: string): Promise<ActionResult> {
  const user = await requireEdit();
  if (!parseYmdOrNull(dateKey)) return badDate();
  try {
    await requireEditForTruck(truckId, user);
    const date = dateFromKey(dateKey);
    await fleetBoardRepo.setFto(date, truckId, user.id);
    await logAction(user, "fleet.fto", "TruckAssignment", null, `${truckId} set as first truck out on ${fmtDate(date)}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}

/** The planned time behind a timed status (late start, early finish, service/dedag). */
export async function setTruckStatusTime(dateKey: string, truckId: string, statusTime: string): Promise<ActionResult> {
  const user = await requireEdit();
  if (!parseYmdOrNull(dateKey)) return badDate();
  const clean = statusTime.trim();
  if (clean && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(clean)) return { ok: false, error: "Time must be HH:MM." };
  try {
    await requireEditForTruck(truckId, user);
    const date = dateFromKey(dateKey);
    await fleetBoardRepo.applyChanges(date, [{ truckId, statusTime: clean || null }], user.id);
    await logAction(
      user,
      "fleet.status",
      "TruckAssignment",
      null,
      clean ? `${truckId} planned time ${clean} on ${fmtDate(date)}` : `${truckId} planned time cleared on ${fmtDate(date)}`,
    );
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
