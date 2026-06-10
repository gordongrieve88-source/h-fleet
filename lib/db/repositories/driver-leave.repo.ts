import { prisma } from "../client";

/**
 * Driver leave — APPROVED blocks the board, PENDING sits in Approvals;
 * stored one row per contiguous run.
 */
export const driverLeaveRepo = {
  /** All leave overlapping [start,end] (inclusive), with driver + type. */
  listOverlapping(start: Date, end: Date) {
    return prisma.driverLeave.findMany({
      where: { startDate: { lte: end }, endDate: { gte: start } },
      include: { driver: { include: { depot: true } }, leaveType: true },
      orderBy: { startDate: "asc" },
    });
  },

  /** Approved leave covering a single day — drops drivers from the board. */
  listApprovedOn(date: Date) {
    return prisma.driverLeave.findMany({
      where: { status: "APPROVED", startDate: { lte: date }, endDate: { gte: date } },
      select: { driverId: true, leaveTypeCode: true },
    });
  },

  add(input: {
    driverId: number;
    leaveTypeCode: string;
    start: Date;
    end: Date;
    status?: string;
    notes?: string | null;
    createdByUserId: number | null;
  }) {
    return prisma.driverLeave.create({
      data: {
        driverId: input.driverId,
        leaveTypeCode: input.leaveTypeCode,
        startDate: input.start,
        endDate: input.end,
        status: input.status ?? "APPROVED",
        notes: input.notes ?? null,
        createdByUserId: input.createdByUserId,
      },
      include: { driver: { include: { depot: true } }, leaveType: true },
    });
  },

  getById(id: number) {
    return prisma.driverLeave.findUnique({
      where: { id },
      include: { driver: { include: { depot: true } }, leaveType: true },
    });
  },

  remove(id: number) {
    return prisma.driverLeave.delete({
      where: { id },
      include: { driver: true, leaveType: true },
    });
  },

  /** Pending requests awaiting a decision, oldest first. */
  listPending() {
    return prisma.driverLeave.findMany({
      where: { status: "PENDING" },
      include: { driver: { include: { depot: true } }, leaveType: true },
      orderBy: { startDate: "asc" },
    });
  },

  countPending() {
    return prisma.driverLeave.count({ where: { status: "PENDING" } });
  },

  /** Approve or reject a pending request (throws if already decided). */
  decide(id: number, status: "APPROVED" | "REJECTED", decidedByUserId: number, decisionNote: string | null) {
    return prisma.driverLeave.update({
      where: { id, status: "PENDING" },
      data: { status, decidedByUserId, decidedAt: new Date(), decisionNote },
      include: { driver: { include: { depot: true } }, leaveType: true },
    });
  },

  listDecidedSince(since: Date) {
    return prisma.driverLeave.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] }, decidedAt: { gte: since } },
      include: { driver: true, leaveType: true },
      orderBy: { decidedAt: "desc" },
      take: 40,
    });
  },

  /** All approved leave overlapping a year, with driver + type — for reports. */
  listApprovedInYear(year: number) {
    return prisma.driverLeave.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: new Date(Date.UTC(year, 11, 31)) },
        endDate: { gte: new Date(Date.UTC(year, 0, 1)) },
      },
      include: { driver: { include: { depot: true } }, leaveType: true },
    });
  },

  /** AL balances per driver/year: entitled (incl. carry-over) vs taken. */
  async alBalances(year: number): Promise<Record<number, { entitled: number; taken: number }>> {
    const yStart = new Date(Date.UTC(year, 0, 1));
    const yEnd = new Date(Date.UTC(year, 11, 31));
    const [ents, taken] = await Promise.all([
      prisma.driverEntitlement.findMany({
        where: { leaveTypeCode: "AL", year },
        select: { driverId: true, entitledDays: true, openingBalance: true },
      }),
      prisma.driverLeave.findMany({
        where: { leaveTypeCode: "AL", status: "APPROVED", startDate: { lte: yEnd }, endDate: { gte: yStart } },
        select: { driverId: true, startDate: true, endDate: true },
      }),
    ]);
    const out: Record<number, { entitled: number; taken: number }> = {};
    for (const e of ents) out[e.driverId] = { entitled: e.entitledDays + e.openingBalance, taken: 0 };
    const yS = yStart.getTime();
    const yE = yEnd.getTime();
    for (const l of taken) {
      const a = Math.max(l.startDate.getTime(), yS);
      const b = Math.min(l.endDate.getTime(), yE);
      let n = 0;
      for (let t = a; t <= b; t += 86_400_000) {
        const dow = new Date(t).getUTCDay();
        if (dow !== 0 && dow !== 6) n++; // working days
      }
      (out[l.driverId] ??= { entitled: 0, taken: 0 }).taken += n;
    }
    return out;
  },
};
