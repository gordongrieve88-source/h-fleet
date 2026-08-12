import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { fleetBoardRepo, auditRepo } from "@/lib/db/repositories";
import { parseYmdOrNull, dateFromKey, fmtDate } from "@/lib/wfm/date";

/**
 * A published Syncrotess roster from the RMX Portal — the allocator uploads
 * the PDF THERE, checks it, and publishing pushes the parsed allocations
 * here: start times and cross-plant work locations onto the day's board,
 * exactly as if the sheet had been imported on this side. Drivers are never
 * touched (the roster PDF carries none). Bearer RMX_HOOK_TOKEN.
 */
export async function POST(request: NextRequest) {
  const token = process.env.RMX_HOOK_TOKEN?.trim();
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "RMX hook not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as { dateKey?: unknown; allocations?: unknown; publishedBy?: unknown };
  const date = typeof b.dateKey === "string" ? parseYmdOrNull(b.dateKey) : null;
  if (!date || !Array.isArray(b.allocations)) {
    return NextResponse.json({ error: "Expected { dateKey, allocations[] }" }, { status: 400 });
  }

  const known = new Set((await prisma.truck.findMany({ select: { id: true } })).map((t) => t.id));
  const seen = new Set<string>();
  const allocations: { truckId: string; driverId: null; time: string | null; workLocation: string | null }[] = [];
  let unknown = 0;
  for (const raw of (b.allocations as Record<string, unknown>[]).slice(0, 500)) {
    const truckId = typeof raw.truck === "string" ? raw.truck.trim().toUpperCase().replace(/-\d+$/, "") : "";
    if (!truckId || seen.has(truckId)) continue;
    if (!known.has(truckId)) {
      unknown++;
      continue;
    }
    seen.add(truckId);
    const time = typeof raw.time === "string" && /^\d{1,2}:\d{2}$/.test(raw.time) ? raw.time.padStart(5, "0") : null;
    const workLocation = typeof raw.location === "string" && raw.location.trim() !== "" ? raw.location.trim().slice(0, 80) : null;
    allocations.push({ truckId, driverId: null, time, workLocation });
  }
  if (allocations.length === 0) return NextResponse.json({ error: "No known trucks in the roster." }, { status: 422 });

  const result = await fleetBoardRepo.applyAllocations(dateFromKey(b.dateKey as string), allocations, false, null);
  const by = typeof b.publishedBy === "string" && b.publishedBy.trim() !== "" ? b.publishedBy.trim().slice(0, 100) : "RMX Portal";
  await auditRepo.log({
    userId: null,
    userName: by,
    action: "fleet.roster.publish",
    entity: "TruckAssignment",
    entityId: null,
    summary:
      `Roster published from the RMX Portal for ${fmtDate(date)} — ${allocations.length} trucks, ` +
      `${result.timesSet} start times, ${result.locations} work locations${unknown ? `, ${unknown} unknown codes skipped` : ""}`,
  });
  return NextResponse.json({ applied: allocations.length, ...result, unknown });
}
