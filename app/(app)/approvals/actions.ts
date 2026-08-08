"use server";

import { revalidatePath } from "next/cache";
import { requireApprover, requireEditForDepot, getDepotScope } from "@/lib/auth";
import { depotInScope } from "@/lib/auth/scope";
import { driverLeaveRepo, fleetBoardRepo, notificationRepo } from "@/lib/db/repositories";
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
  const pendingRec = await driverLeaveRepo.getById(id);
  if (!pendingRec) return { ok: false, error: "That request has already been decided or withdrawn." };
  try {
    // Approvals are scoped by the driver's depot, like every other edit.
    await requireEditForDepot(pendingRec.driver.depotId, user);
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
  }
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
  // Tell the driver themselves, if their sign-in account is linked.
  if (pendingRec.driver.appUserId != null) {
    await notificationRepo.create({
      userId: pendingRec.driver.appUserId,
      kind: "leave",
      title: `Your ${rec.leaveTypeCode} leave was ${approve ? "approved" : "declined"}`,
      body: `${range}${note ? ` — ${note}` : ""}`,
      href: "/me",
    });
  }
  refresh();
  return { ok: true };
}

export async function approveAllPendingDriverLeave(): Promise<ActionResult & { count?: number }> {
  const user = await requireApprover();
  const scope = await getDepotScope(user);
  const pending = (await driverLeaveRepo.listPending()).filter((lv) => depotInScope(scope, lv.driver.depotId));
  let count = 0;
  for (const lv of pending) {
    const res = await decideDriverLeave(lv.id, true, null);
    if (res.ok) count++;
  }
  return { ok: true, count };
}
