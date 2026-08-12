import { NextResponse, type NextRequest } from "next/server";
import { denyBiRequest } from "@/lib/bi/auth";
import { fleetBoardRepo, fleetRepo, driverLeaveRepo } from "@/lib/db/repositories";
import { availabilityByDay, plannedVsActual, truckReliability } from "@/lib/wfm/analytics";
import { toCsv } from "@/lib/wfm/csv";
import { addDaysUTC, parseYmdOrNull, todayUTC, ymd } from "@/lib/wfm/date";
import { isOnRoad, statusLabel } from "@/lib/wfm/fleet";

export const dynamic = "force-dynamic";

/**
 * Read-only BI feed for Power BI (Web connector) and friends.
 *
 *   GET /api/bi/<dataset>?from=&to=&format=json|csv
 *   Authorization: Bearer <BI_API_TOKEN>
 *
 * Datasets: assignments · availability · reliability · leave · plan-vs-actual
 *
 * Roster facts only — no pay, no personal contact details, no credentials.
 * Saved days only, so a projection never lands in a management report.
 */

const DATASETS = ["assignments", "availability", "reliability", "leave", "plan-vs-actual"] as const;
type Dataset = (typeof DATASETS)[number];

type Table = { headers: string[]; rows: (string | number | null)[][] };

export async function GET(request: NextRequest, { params }: { params: Promise<{ dataset: string }> }) {
  const denied = denyBiRequest(request);
  if (denied) return denied;

  const { dataset } = await params;
  if (!DATASETS.includes(dataset as Dataset)) {
    return NextResponse.json({ error: `Unknown dataset. Available: ${DATASETS.join(", ")}` }, { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const to = parseYmdOrNull(sp.get("to")) ?? todayUTC();
  const from = parseYmdOrNull(sp.get("from")) ?? addDaysUTC(to, -89);
  if (from > to) return NextResponse.json({ error: "'from' is after 'to'." }, { status: 400 });

  const table = await buildTable(dataset as Dataset, from, to);

  if ((sp.get("format") ?? "json").toLowerCase() === "csv") {
    return new NextResponse(toCsv(table.headers, table.rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="h-fleet-${dataset}-${ymd(from)}_${ymd(to)}.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  // Objects keyed by header — what Power BI's JSON parser expects.
  const key = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const keys = table.headers.map(key);
  return NextResponse.json(
    {
      dataset,
      from: ymd(from),
      to: ymd(to),
      rowCount: table.rows.length,
      rows: table.rows.map((r) => Object.fromEntries(r.map((v, i) => [keys[i], v]))),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

async function buildTable(dataset: Dataset, from: Date, to: Date): Promise<Table> {
  switch (dataset) {
    case "assignments": {
      const [rows, trucks] = await Promise.all([fleetBoardRepo.assignmentsInRange(from, to), fleetRepo.listAllTrucks()]);
      const meta = new Map(trucks.map((t) => [t.id, t]));
      return {
        headers: ["Date", "Truck", "Depot", "Region", "Block", "Status", "On road", "Crewed"],
        rows: rows.map((r) => {
          const m = meta.get(r.truckId);
          return [
            ymd(r.date),
            r.truckId,
            m?.depot.name ?? "",
            m?.region ?? "",
            m?.block ?? "",
            statusLabel(r.status),
            isOnRoad(r.status) ? 1 : 0,
            r.driverId == null ? 0 : 1,
          ];
        }),
      };
    }
    case "availability": {
      const rows = await fleetBoardRepo.assignmentsInRange(from, to);
      return {
        headers: ["Date", "On road", "Total", "Availability pct", "Needs cover"],
        rows: availabilityByDay(rows).map((a) => [a.dateKey, a.on, a.total, Number((a.pct * 100).toFixed(2)), a.needsCover]),
      };
    }
    case "reliability": {
      const [rows, trucks] = await Promise.all([fleetBoardRepo.assignmentsInRange(from, to), fleetRepo.listAllTrucks()]);
      const meta = new Map(trucks.map((t) => [t.id, t]));
      return {
        headers: ["Truck", "Depot", "Region", "Captured days", "Breakdown days", "Service days", "On road days", "Breakdown rate pct", "Availability pct"],
        rows: truckReliability(rows).map((r) => {
          const m = meta.get(r.truck);
          return [
            r.truck,
            m?.depot.name ?? "",
            m?.region ?? "",
            r.days,
            r.breakdownDays,
            r.serviceDays,
            r.onDays,
            Number((r.breakdownRate * 100).toFixed(2)),
            Number((r.availability * 100).toFixed(2)),
          ];
        }),
      };
    }
    case "leave": {
      const rows = await driverLeaveRepo.listOverlapping(from, to);
      return {
        headers: ["Driver", "Employee no", "Depot", "Region", "Leave type", "Start", "End", "Status"],
        rows: rows.map((l) => [
          l.driver.name,
          l.driver.employeeNo,
          l.driver.depot.name,
          l.driver.depot.regionName,
          l.leaveTypeCode,
          ymd(l.startDate),
          ymd(l.endDate),
          l.status,
        ]),
      };
    }
    case "plan-vs-actual": {
      const [rows, trucks] = await Promise.all([fleetBoardRepo.assignmentsInRange(from, to), fleetRepo.listAllTrucks()]);
      const churn = plannedVsActual(rows, new Map(trucks.map((t) => [t.id, t.defaultDriverId])));
      return {
        headers: ["Date", "Off plan", "Total", "Off plan pct"],
        rows: churn.byDay.map((d) => [d.dateKey, d.changed, d.total, Number((d.pct * 100).toFixed(2))]),
      };
    }
  }
}
