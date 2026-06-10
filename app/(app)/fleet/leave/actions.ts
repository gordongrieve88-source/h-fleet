"use server";

import { revalidatePath } from "next/cache";
import { requireEdit } from "@/lib/auth";
import { driverLeaveRepo, fleetRepo, notificationRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { dateFromKey, parseYmdOrNull, fmtRange } from "@/lib/wfm/date";

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
    for (const s of segments) {
      await driverLeaveRepo.add({
        driverId,
        leaveTypeCode,
        start: dateFromKey(s.start),
        end: dateFromKey(s.end),
        status,
        createdByUserId: user.id,
      });
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
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
}

export async function removeDriverLeave(id: number): Promise<ActionResult> {
  const user = await requireEdit();
  try {
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
  } catch {
    return { ok: false, error: "That booking no longer exists." };
  }
}
