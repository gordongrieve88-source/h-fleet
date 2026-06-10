"use server";

import { revalidatePath } from "next/cache";
import { requireEdit } from "@/lib/auth";
import { fleetBoardRepo, fleetRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { dateFromKey, parseYmdOrNull, fmtDate } from "@/lib/wfm/date";
import { statusLabel } from "@/lib/wfm/fleet";

export type ActionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/fleet");
  revalidatePath("/");
}

function badDate(): ActionResult {
  return { ok: false, error: "Invalid date." };
}

/** Move/swap a driver onto a truck. `from` is the source truck id or "pool". */
export async function moveDriver(
  dateKey: string,
  from: string,
  driverId: number,
  toTruck: string,
): Promise<ActionResult> {
  const user = await requireEdit();
  if (!parseYmdOrNull(dateKey)) return badDate();
  try {
    const date = dateFromKey(dateKey);
    await fleetBoardRepo.materialise(date, user.id);
    const rows = await fleetBoardRepo.getBoard(date);
    const target = rows.find((r) => r.truck === toTruck);
    if (!target) return { ok: false, error: "Unknown truck." };
    const displaced = target.driverId;
    const changes: { truckId: string; driverId?: number | null; status?: string }[] = [
      // Landing a driver on a "driver not in" truck brings it back on road.
      { truckId: toTruck, driverId, ...(target.status === "OFF-ND" ? { status: "ON" } : {}) },
    ];
    if (from !== "pool" && from !== toTruck) changes.push({ truckId: from, driverId: displaced });
    await fleetBoardRepo.applyChanges(date, changes, user.id);

    const driver = await fleetRepo.getDriver(driverId);
    const what =
      from === "pool"
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
    const date = dateFromKey(dateKey);
    await fleetBoardRepo.applyChanges(date, [{ truckId, driverId: null }], user.id);
    await logAction(user, "fleet.clear", "TruckAssignment", null, `Cleared driver off ${truckId} on ${fmtDate(date)}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}

/** Discard a day's edits — the board reverts to the roll-forward default. */
export async function resetBoardDay(dateKey: string): Promise<ActionResult> {
  const user = await requireEdit();
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
