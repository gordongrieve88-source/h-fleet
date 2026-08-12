"use server";

import { revalidatePath } from "next/cache";
import { requireEdit, requireEditForDepot } from "@/lib/auth";
import { driverLeaveRepo, fleetRepo, fleetBoardRepo, notificationRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { dateFromKey, parseYmdOrNull, fmtRange, ymd } from "@/lib/wfm/date";
import { pushRosterChanges } from "@/lib/integrations/rmx-push";

export type ActionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/fleet/leave");
  revalidatePath("/fleet");
  revalidatePath("/approvals");
  revalidatePath("/");
}

/**
 * Add one or more leave segments (already split into working-day runs).
 * `status` is "APPROVED" (booked directly) or "PENDING" (a request to approve).
 */
export async function addDriverLeave(
  driverId: number,
  leaveTypeCode: string,
  segments: { start: string; end: string }[],
  status: "APPROVED" | "PENDING" = "APPROVED",
): Promise<ActionResult> {
  const user = await requireEdit();
  if (segments.length === 0) return { ok: false, error: "No working days in that range." };
  for (const s of segments) {
    if (!parseYmdOrNull(s.start) || !parseYmdOrNull(s.end)) return { ok: false, error: "Invalid date." };
  }
  try {
    const driver = await fleetRepo.getDriver(driverId);
    if (!driver || !driver.isActive) return { ok: false, error: "Unknown driver." };
    await requireEditForDepot(driver.depotId, user); // leave is scoped by the driver's depot
    const dropped: { date: Date; truckId: string }[] = [];
    for (const s of segments) {
      await driverLeaveRepo.add({
        driverId,
        leaveTypeCode,
        start: dateFromKey(s.start),
        end: dateFromKey(s.end),
        status,
        createdByUserId: user.id,
      });
      // Booked leave blocks the board immediately: already-saved days in the
      // range must release the driver and turn their trucks off, exactly as
      // an approval does. Unsaved days handle it in synthesis.
      if (status === "APPROVED") {
        dropped.push(...(await fleetBoardRepo.dropDriverFromRange(driverId, dateFromKey(s.start), dateFromKey(s.end))));
      }
    }
    const range = fmtRange(dateFromKey(segments[0].start), dateFromKey(segments[segments.length - 1].end));
    await logAction(
      user,
      status === "PENDING" ? "fleet.leave.request" : "fleet.leave.book",
      "DriverLeave",
      null,
      `${status === "PENDING" ? "Requested" : "Booked"} ${leaveTypeCode} for ${driver.name} (${range})`,
    );
    if (status === "PENDING") {
      await notificationRepo.createForApprovers({
        kind: "fleet",
        title: `Driver leave request: ${driver.name}`,
        body: `${leaveTypeCode} · ${range}`,
        href: "/approvals",
      });
    }
    // Tell the allocators which trucks just lost their driver, day by day.
    const byDay = new Map<string, string[]>();
    for (const hit of dropped) {
      const k = ymd(hit.date);
      byDay.set(k, [...(byDay.get(k) ?? []), hit.truckId]);
    }
    for (const [dayKey, trucks] of byDay) {
      await pushRosterChanges(
        dayKey,
        trucks.map((truck) => ({ truck, summary: `OFF-ND — driver on ${leaveTypeCode} leave`, status: "OFF-ND" })),
      );
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}

export async function removeDriverLeave(id: number): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    const existing = await driverLeaveRepo.getById(id);
    if (!existing) return { ok: false, error: "That booking no longer exists." };
    await requireEditForDepot(existing.driver.depotId, user);
    const rec = await driverLeaveRepo.remove(id);
    await logAction(
      user,
      "fleet.leave.remove",
      "DriverLeave",
      id,
      `Removed ${rec.leaveTypeCode} for ${rec.driver.name} (${fmtRange(rec.startDate, rec.endDate)})`,
    );
    refresh();
    return { ok: true };
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Forbidden")) return { ok: false, error: msg.replace(/^Error:\s*/, "").slice(0, 160) };
    return { ok: false, error: "That booking no longer exists." };
  }
}
