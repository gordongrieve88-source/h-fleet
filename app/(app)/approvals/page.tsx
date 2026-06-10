import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isApproverRole } from "@/lib/auth/roles";
import { driverLeaveRepo, fleetRepo } from "@/lib/db/repositories";
import { PageHeader, Card } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { addDaysUTC, todayUTC, fmtDate, fmtDayShort } from "@/lib/wfm/date";
import { DriverLeaveApprovalRow, BulkApproveButton, type CoverageImpact } from "./ApprovalRows";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  if (!isApproverRole(user?.role)) redirect("/fleet");

  const today = todayUTC();
  const thirtyDaysAgo = addDaysUTC(today, -30);

  const [pendingDriverLeave, recentDriverLeave, fleetDepots] = await Promise.all([
    driverLeaveRepo.listPending(),
    driverLeaveRepo.listDecidedSince(thirtyDaysAgo),
    fleetRepo.listDepots(),
  ]);

  // Driver-leave impact: would approving stretch the driver's depot past the
  // planner's flag (≥30% of the depot off, min 2) on any working day?
  const impactByDriverLeave: Record<number, CoverageImpact> = {};
  if (pendingDriverLeave.length > 0) {
    let dlStart = pendingDriverLeave[0].startDate;
    let dlEnd = pendingDriverLeave[0].endDate;
    for (const lv of pendingDriverLeave) {
      if (lv.startDate < dlStart) dlStart = lv.startDate;
      if (lv.endDate > dlEnd) dlEnd = lv.endDate;
    }
    const overlapping = await driverLeaveRepo.listOverlapping(dlStart, dlEnd);
    const depotSize = new Map(fleetDepots.map((dp) => [dp.name, dp._count.drivers]));
    for (const lv of pendingDriverLeave) {
      const depotName = lv.driver.depot.name;
      const size = depotSize.get(depotName) ?? 0;
      const flagAt = Math.max(2, Math.ceil(size * 0.3));
      const risky: CoverageImpact["riskyDays"] = [];
      for (let d = new Date(lv.startDate); d <= lv.endDate; d = addDaysUTC(d, 1)) {
        if (d.getUTCDay() === 0) continue; // no Sunday operations
        const off = overlapping.filter(
          (o) =>
            o.status === "APPROVED" &&
            o.driver.depot.name === depotName &&
            o.startDate <= d &&
            o.endDate >= d &&
            o.driverId !== lv.driverId,
        ).length;
        if (off + 1 >= flagAt) risky.push({ dateLabel: fmtDayShort(d), before: off, after: off + 1, target: flagAt });
      }
      impactByDriverLeave[lv.id] = {
        riskyDays: risky,
        severity: risky.some((r) => r.after >= r.target + 2) ? "critical" : risky.length > 0 ? "warn" : "ok",
      };
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Approvals"
        description="Driver leave awaiting a decision. Depot impact is shown inline, so you can see what an approval costs before you say yes."
      />

      <Card
        title="Driver leave"
        count={pendingDriverLeave.length}
        actions={pendingDriverLeave.length > 1 ? <BulkApproveButton count={pendingDriverLeave.length} /> : undefined}
      >
        {pendingDriverLeave.length === 0 ? (
          <EmptyState icon="🚚" title="No driver leave waiting — you're all caught up." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendingDriverLeave.map((lv) => (
              <DriverLeaveApprovalRow
                key={lv.id}
                id={lv.id}
                driverName={lv.driver.name}
                depotName={lv.driver.depot.name}
                typeCode={lv.leaveTypeCode}
                typeColor={lv.leaveType.colorHex ?? "#475569"}
                dateLabel={
                  lv.endDate.getTime() !== lv.startDate.getTime() ? `${fmtDate(lv.startDate)} – ${fmtDate(lv.endDate)}` : fmtDate(lv.startDate)
                }
                notes={lv.notes}
                impact={impactByDriverLeave[lv.id]}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent decisions" count="last 30 days">
        {recentDriverLeave.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-400">No recent driver-leave decisions.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {recentDriverLeave.map((lv) => (
              <li key={lv.id} className="flex items-center justify-between gap-2 px-4 py-1.5 text-xs">
                <span className="text-slate-600">
                  <strong className="font-semibold text-slate-700">{lv.driver.name}</strong> · {lv.leaveTypeCode} ·{" "}
                  {fmtDate(lv.startDate)}
                  {lv.status === "REJECTED" && lv.decisionNote && <span className="text-rose-500"> — {lv.decisionNote}</span>}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    lv.status === "APPROVED" ? "bg-brand-mid/15 text-brand-deep" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {lv.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
