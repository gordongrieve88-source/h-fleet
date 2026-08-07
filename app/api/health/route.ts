import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/health — liveness + database reachability, for nginx upstream
 * checks, uptime monitors and the systemd watchdog. Unauthenticated (the
 * proxy exempts it) and deliberately content-free beyond up/down.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
