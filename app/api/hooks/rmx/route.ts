import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * Acknowledgements pushed back from the RMX Portal: an allocator actioned
 * (or reopened) one of the board changes we sent them. Stored keyed by the
 * RMX change id — re-sends upsert, reopens delete — and shown as a green
 * tick on the board row. Machine-to-machine: bearer token (RMX_HOOK_TOKEN),
 * off entirely until configured. The demo gate proxy exempts /api/hooks/.
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
  const b = body as Record<string, unknown>;
  const changeId = typeof b.changeId === "string" && b.changeId.trim() !== "" ? b.changeId.slice(0, 64) : null;
  const dateKey = typeof b.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.dateKey) ? b.dateKey : null;
  const truck = typeof b.truck === "string" && b.truck.trim() !== "" ? b.truck.slice(0, 20) : null;
  if (!changeId || !dateKey || !truck) {
    return NextResponse.json({ error: "Expected { changeId, dateKey, truck, actioned, ... }" }, { status: 400 });
  }

  if (b.actioned === false) {
    await prisma.allocatorAck.deleteMany({ where: { changeId } });
    return NextResponse.json({ ok: true, removed: true });
  }

  const data = {
    date: new Date(`${dateKey}T00:00:00.000Z`),
    truckId: truck,
    summary: typeof b.summary === "string" ? b.summary.slice(0, 400) : "",
    actionedBy: typeof b.actionedBy === "string" ? b.actionedBy.slice(0, 100) : "allocations",
    actionedAt: typeof b.actionedAt === "string" && !Number.isNaN(Date.parse(b.actionedAt)) ? new Date(b.actionedAt) : new Date(),
  };
  await prisma.allocatorAck.upsert({ where: { changeId }, create: { changeId, ...data }, update: data });
  return NextResponse.json({ ok: true });
}
