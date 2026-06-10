"use server";

import { revalidatePath } from "next/cache";
import { requireApprover } from "@/lib/auth";
import { driverLeaveRepo, fleetBoardRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { fmtRange } from "@/lib/wfm/date";

export type ActionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/approvals");
  revalidatePath("/fleet");
  revalidatePath("/fleet/leave");
}

export async function decideDriverLeave(id: number, approve: boolean, note: string | null): Promise<ActionResult> {
  const user = await requireApprover();
  let rec;
  try {
    rec = await driverLeaveRepo.decide(id, approve ? "APPROVED" : "REJECTED", user.id, note?.trim().slice(0, 240) || null);
  } catch {
    return { ok: false, error: "That request has already been decided or withdrawn." };
  }
  if (approve) {
    // Approved leave wins: drop the driver off any already-saved board days.
    // Unsaved days pick the leave up automatically via the roll-forward.
    await fleetBoardRepo.dropDriverFromRange(rec.driverId, rec.startDate, rec.endDate);
  }
  const range = fmtRange(rec.startDate, rec.endDate);
  await logAction(
    user,
    approve ? "fleet.leave.approve" : "fleet.leave.reject",
    "DriverLeave",
    id,
    `${approve ? "Approved" : "Rejected"} ${rec.driver.name}'s ${rec.leaveTypeCode} (${range})${note ? ` — ${note}` : ""}`,
  );
  refresh();
  return { ok: true };
}

export async function approveAllPendingDriverLeave(): Promise<ActionResult & { count?: number }> {
  await requireApprover();
  const pending = await driverLeaveRepo.listPending();
  let count = 0;
  for (const lv of pending) {
    const res = await decideDriverLeave(lv.id, true, null);
    if (res.ok) count++;
  }
  return { ok: true, count };
}
