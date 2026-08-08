import { canEdit, getDepotScope } from "@/lib/auth";
import { fleetBoardRepo, driverLeaveRepo, referenceRepo, complianceRepo } from "@/lib/db/repositories";
import { loadFleetCatalog } from "@/lib/fleet/catalog";
import { isOnRoad } from "@/lib/wfm/fleet";
import { addDaysUTC, fmtDate, parseYmdOrNull, todayUTC, ymd } from "@/lib/wfm/date";
import {
  credentialState,
  daysUntil,
  runLengthEndingAt,
  FATIGUE_WARN_DAYS,
  FATIGUE_CRITICAL_DAYS,
} from "@/lib/wfm/compliance";
import { PageHeader } from "@/components/PageHeader";
import { FleetBoard, type DoctorIssueGroup } from "@/components/fleet/FleetBoard";

export const dynamic = "force-dynamic";

export default async function FleetBoardPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const date = parseYmdOrNull(d ?? null) ?? todayUTC();
  const dateKey = ymd(date);

  const [catalog, rows, onLeaveRaw, leaveTypes, isCaptured, editor, depotScope] = await Promise.all([
    loadFleetCatalog(),
    fleetBoardRepo.getBoard(date),
    driverLeaveRepo.listApprovedOn(date),
    referenceRepo.listLeaveTypes(),
    fleetBoardRepo.isMaterialised(date),
    canEdit(),
    getDepotScope(),
  ]);
  // Depot names this user may edit; null = all of them.
  const editableDepots =
    depotScope === null ? null : catalog.depots.filter((dep) => depotScope.includes(dep.id)).map((dep) => dep.name);

  // ---- Fleet doctor: scan today's board for things a dispatcher must fix ----
  const driverById = new Map(catalog.drivers.map((dr) => [dr.id, dr]));
  const onLeaveIds = new Set(onLeaveRaw.map((l) => l.driverId));
  const doctor: DoctorIssueGroup[] = [];

  const needsCover = rows.filter((r) => r.driverId == null && (isOnRoad(r.status) || r.status.toUpperCase() === "OFF-ND"));
  if (needsCover.length > 0) {
    doctor.push({
      kind: "critical",
      label: "Needs cover",
      items: needsCover.map((r) => `${r.truck} · ${r.status}`),
    });
  }

  const rosteredOnLeave = rows.filter((r) => r.driverId != null && onLeaveIds.has(r.driverId));
  if (rosteredOnLeave.length > 0) {
    doctor.push({
      kind: "critical",
      label: "Rostered while on leave",
      items: rosteredOnLeave.map((r) => `${driverById.get(r.driverId!)?.name ?? `#${r.driverId}`} on ${r.truck}`),
    });
  }

  const seen = new Map<number, string>();
  const doubled: string[] = [];
  for (const r of rows) {
    if (r.driverId == null) continue;
    const prev = seen.get(r.driverId);
    if (prev) doubled.push(`${driverById.get(r.driverId)?.name ?? `#${r.driverId}`} on ${prev} + ${r.truck}`);
    else seen.set(r.driverId, r.truck);
  }
  if (doubled.length > 0) doctor.push({ kind: "critical", label: "On two trucks", items: doubled });

  const breakdowns = rows.filter((r) => r.status.toUpperCase() === "OFF-BD");
  if (breakdowns.length > 0) {
    doctor.push({ kind: "warn", label: "Breakdowns", items: breakdowns.map((r) => r.truck) });
  }
  const attention = rows.filter((r) => ["ON-SER", "ON-DED"].includes(r.status.toUpperCase()));
  if (attention.length > 0) {
    doctor.push({ kind: "warn", label: "Needs service / dedag", items: attention.map((r) => `${r.truck} · ${r.status}`) });
  }

  // ---- Compliance: credentials + fatigue runs for today's rostered drivers ----
  const rosteredIds = [...new Set(rows.filter((r) => r.driverId != null && isOnRoad(r.status)).map((r) => r.driverId!))];
  const fatigueWindow = FATIGUE_CRITICAL_DAYS + 8; // headroom so long runs read accurately
  const [rosteredCreds, workedSets] = await Promise.all([
    complianceRepo.forDrivers(rosteredIds),
    complianceRepo.workedDaySets(addDaysUTC(date, -fatigueWindow), date),
  ]);

  const expiredBlocking: string[] = [];
  const expiredWarn: string[] = [];
  const expiringSoon: string[] = [];
  for (const c of rosteredCreds) {
    const state = credentialState(c.expiresOn, date, c.type.warnDays);
    const name = driverById.get(c.driverId)?.name ?? `#${c.driverId}`;
    if (state === "expired") {
      (c.type.severity === "BLOCK" ? expiredBlocking : expiredWarn).push(
        `${name} — ${c.type.name} expired ${fmtDate(c.expiresOn!)}`,
      );
    } else if (state === "expiring") {
      const days = daysUntil(c.expiresOn!, date);
      expiringSoon.push(`${name} — ${c.type.name} ${days === 0 ? "expires today" : `expires in ${days}d`}`);
    }
  }
  if (expiredBlocking.length > 0) doctor.push({ kind: "critical", label: "Rostered with expired credential", items: expiredBlocking });
  if (expiredWarn.length > 0) doctor.push({ kind: "warn", label: "Expired credentials", items: expiredWarn });
  if (expiringSoon.length > 0) doctor.push({ kind: "warn", label: "Credentials expiring", items: expiringSoon });

  const fatigueCritical: string[] = [];
  const fatigueWarnList: string[] = [];
  for (const id of rosteredIds) {
    const run = runLengthEndingAt(workedSets.get(id) ?? new Set(), dateKey);
    if (run < FATIGUE_WARN_DAYS) continue;
    const label = `${driverById.get(id)?.name ?? `#${id}`} — ${run > fatigueWindow ? `${fatigueWindow}+` : run} days straight`;
    (run >= FATIGUE_CRITICAL_DAYS ? fatigueCritical : fatigueWarnList).push(label);
  }
  if (fatigueCritical.length > 0) doctor.push({ kind: "critical", label: "Fatigue risk", items: fatigueCritical });
  if (fatigueWarnList.length > 0) doctor.push({ kind: "warn", label: "Long runs (no day off)", items: fatigueWarnList });

  const noDefault = catalog.trucks.filter((t) => t.defaultDriverId == null);
  if (noDefault.length > 0) {
    doctor.push({
      kind: "info",
      label: "No default driver",
      items: noDefault.map((t) => `${t.id} · ${t.block}`),
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fleet board"
        description="The daily truck board — every agitator, who's in it, and its status. Days roll forward from each truck's default driver; the first edit saves the day as history."
      />
      <FleetBoard
        date={dateKey}
        catalog={catalog}
        rows={rows}
        onLeave={onLeaveRaw}
        leaveTypes={leaveTypes.map((t) => ({ code: t.code, name: t.name, color: t.colorHex ?? "#64748b" }))}
        doctor={doctor}
        canEdit={editor}
        editableDepots={editableDepots}
        isCaptured={isCaptured}
      />
    </div>
  );
}
