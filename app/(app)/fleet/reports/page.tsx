import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isInsightsRole } from "@/lib/auth/roles";
import { fleetBoardRepo, driverLeaveRepo, fleetRepo, referenceRepo } from "@/lib/db/repositories";
import { addDaysUTC, todayUTC, ymd } from "@/lib/wfm/date";
import { isOnRoad } from "@/lib/wfm/fleet";
import { PageHeader } from "@/components/PageHeader";
import { FleetReports } from "@/components/fleet/FleetReports";
import { TimesheetExport } from "@/components/fleet/TimesheetExport";

export const dynamic = "force-dynamic";

function workingDaysClamped(start: Date, end: Date, yStart: number, yEnd: number): number {
  const a = Math.max(start.getTime(), yStart);
  const b = Math.min(end.getTime(), yEnd);
  let n = 0;
  for (let t = a; t <= b; t += 86_400_000) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) n++;
  }
  return n;
}

export default async function FleetReportsPage({ searchParams }: { searchParams: Promise<{ y?: string }> }) {
  const user = await getCurrentUser();
  if (!isInsightsRole(user?.role)) redirect("/fleet");

  const sp = await searchParams;
  const year = sp.y && /^\d{4}$/.test(sp.y) ? Number(sp.y) : new Date().getUTCFullYear();
  const first = new Date(Date.UTC(year, 0, 1));
  const last = new Date(Date.UTC(year, 11, 31));
  const yStart = first.getTime();
  const yEnd = last.getTime();

  const [leaveRows, balances, assignments, trucks, leaveTypes] = await Promise.all([
    driverLeaveRepo.listApprovedInYear(year),
    driverLeaveRepo.alBalances(year),
    fleetBoardRepo.assignmentsInRange(first, last),
    fleetRepo.listAllTrucks(),
    referenceRepo.listLeaveTypes(),
  ]);

  // ---- Leave taken (per driver, per type) ----
  const typeCodes = leaveTypes.map((t) => t.code);
  const leaveByDriver = new Map<number, { name: string; depot: string; region: string; byType: Record<string, number>; total: number }>();
  for (const l of leaveRows) {
    const days = workingDaysClamped(l.startDate, l.endDate, yStart, yEnd);
    if (days === 0) continue;
    let row = leaveByDriver.get(l.driverId);
    if (!row) {
      row = { name: l.driver.name, depot: l.driver.depot.name, region: l.driver.depot.regionName, byType: {}, total: 0 };
      leaveByDriver.set(l.driverId, row);
    }
    row.byType[l.leaveTypeCode] = (row.byType[l.leaveTypeCode] ?? 0) + days;
    row.total += days;
  }
  const leaveTaken = [...leaveByDriver.entries()]
    .map(([id, r]) => ({ ...r, alRemaining: balances[id] ? Math.max(0, balances[id].entitled - balances[id].taken) : null }))
    .sort((a, b) => b.total - a.total);

  // ---- Truck utilisation (over captured days) ----
  const truckMeta = new Map(trucks.map((t) => [t.id, { depot: t.depot.name, region: t.region, block: t.block }]));
  const byTruck = new Map<string, { captured: Set<string>; on: number }>();
  const capturedDates = new Set<string>();
  for (const a of assignments) {
    const key = ymd(a.date);
    capturedDates.add(key);
    let row = byTruck.get(a.truckId);
    if (!row) {
      row = { captured: new Set(), on: 0 };
      byTruck.set(a.truckId, row);
    }
    row.captured.add(key);
    if (isOnRoad(a.status)) row.on++;
  }
  const utilisation = [...byTruck.entries()]
    .map(([id, r]) => {
      const m = truckMeta.get(id);
      const captured = r.captured.size;
      return {
        truck: id,
        depot: m?.depot ?? "—",
        region: m?.region ?? "—",
        block: m?.block ?? "—",
        captured,
        onDays: r.on,
        pct: captured ? r.on / captured : 0,
      };
    })
    .sort((a, b) => a.pct - b.pct || a.truck.localeCompare(b.truck));

  // ---- Daily availability (captured days) ----
  const byDate = new Map<string, { on: number; total: number }>();
  for (const a of assignments) {
    const key = ymd(a.date);
    const row = byDate.get(key) ?? { on: 0, total: 0 };
    row.total++;
    if (isOnRoad(a.status)) row.on++;
    byDate.set(key, row);
  }
  const availability = [...byDate.entries()]
    .map(([date, r]) => ({ date, on: r.on, total: r.total, pct: r.total ? r.on / r.total : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fleet reports"
        description={`Leave, utilisation and availability for ${year}. Utilisation and availability are built from ${capturedDates.size} captured day${capturedDates.size === 1 ? "" : "s"} (days that have been edited/saved).`}
      />
      <TimesheetExport defaultFrom={ymd(addDaysUTC(todayUTC(), -13))} defaultTo={ymd(todayUTC())} />
      <FleetReports
        year={year}
        leaveTypeCodes={typeCodes}
        leaveTaken={leaveTaken}
        utilisation={utilisation}
        availability={availability}
      />
    </div>
  );
}
