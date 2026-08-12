import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { fleetBoardRepo } from "@/lib/db/repositories";
import { parseYmdOrNull } from "@/lib/wfm/date";

/**
 * The board for one day, machine-readable — what the RMX Portal's roster
 * accuracy checker compares the allocator's Syncrotess PDF against. This is
 * the digital version of the old workbook: per truck, its status (ON/OFF and
 * the timed codes), the planned time, first-truck-out, home plant and any
 * cross-plant work location. Bearer RMX_HOOK_TOKEN; the gate proxy exempts
 * machine hooks.
 */
export async function GET(request: NextRequest) {
  const token = process.env.RMX_HOOK_TOKEN?.trim();
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "RMX hook not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const dateKey = request.nextUrl.searchParams.get("date") ?? "";
  const date = parseYmdOrNull(dateKey);
  if (!date) return NextResponse.json({ error: "Expected ?date=YYYY-MM-DD" }, { status: 400 });

  const [rows, trucks] = await Promise.all([
    fleetBoardRepo.getBoard(date),
    prisma.truck.findMany({
      where: { isActive: true },
      select: { id: true, block: true, rosterGroup: true, depot: { select: { name: true } } },
    }),
  ]);
  const truckById = new Map(trucks.map((t) => [t.id, t]));
  return NextResponse.json({
    dateKey,
    rows: rows.map((r) => {
      const t = truckById.get(r.truck);
      return {
        truck: r.truck,
        status: r.status,
        fto: r.fto,
        statusTime: r.statusTime,
        time: r.time,
        block: t?.block ?? "",
        homePlant: t?.depot.name ?? "",
        workLocation: r.workLocation,
        rosterGroup: t?.rosterGroup ?? 2,
      };
    }),
  });
}
