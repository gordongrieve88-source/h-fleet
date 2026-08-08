import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getDepotScope } from "@/lib/auth";
import { isApproverRole } from "@/lib/auth/roles";
import { timesheetRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { toCsv } from "@/lib/wfm/csv";
import { parseYmdOrNull, todayUTC, addDaysUTC, ymd } from "@/lib/wfm/date";
import { isOnRoad, statusLabel } from "@/lib/wfm/fleet";

export const dynamic = "force-dynamic";

/**
 * GET /fleet/reports/timesheet?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Payroll-facing timesheet CSV: one row per driver per saved day.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!isApproverRole(user?.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const to = parseYmdOrNull(sp.get("to")) ?? todayUTC();
  const from = parseYmdOrNull(sp.get("from")) ?? addDaysUTC(to, -13);
  if (from > to) return new NextResponse("'from' is after 'to'", { status: 400 });

  const scope = await getDepotScope(user);
  const rows = await timesheetRepo.rows(from, to, scope);

  const csv = toCsv(
    ["Date", "Employee no", "Driver", "Home depot", "Truck", "Truck depot", "Region", "Work location", "Start time", "Status", "On road"],
    rows.map((r) => [
      ymd(r.date),
      r.driver?.employeeNo ?? "",
      r.driver?.name ?? "",
      r.driver?.depot.name ?? "",
      r.truckId,
      r.truck.depot.name,
      r.truck.region,
      r.workLocation ?? r.truck.depot.name,
      r.time ?? "",
      statusLabel(r.status),
      isOnRoad(r.status) ? "Y" : "N",
    ]),
  );

  await logAction(
    user!,
    "fleet.timesheet.export",
    "TruckAssignment",
    null,
    `Exported timesheet ${ymd(from)} → ${ymd(to)} (${rows.length} rows${scope ? ", own depots only" : ""})`,
  );

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="h-fleet-timesheet-${ymd(from)}_${ymd(to)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
