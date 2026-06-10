import { prisma } from "../client";
import { driverLeaveRepo } from "./driver-leave.repo";

export interface FleetBoardRow {
  truck: string;
  status: string;
  driverId: number | null;
  time: string | null;
}

/**
 * The daily fleet board. A date with saved TruckAssignment rows returns those
 * (history); a date with none is synthesised from each truck's default driver
 * ("roll forward"), with anyone on approved leave dropped to "needs cover".
 * The first edit materialises the full day so it becomes saved history.
 */
export const fleetBoardRepo = {
  async getBoard(date: Date): Promise<FleetBoardRow[]> {
    const saved = await prisma.truckAssignment.findMany({
      where: { date },
      select: { truckId: true, status: true, driverId: true, time: true },
    });
    if (saved.length > 0) {
      return saved.map((a) => ({ truck: a.truckId, status: a.status, driverId: a.driverId, time: a.time }));
    }
    return this.synthesise(date);
  },

  async synthesise(date: Date): Promise<FleetBoardRow[]> {
    const [trucks, onLeave] = await Promise.all([
      prisma.truck.findMany({
        where: { isActive: true },
        orderBy: [{ region: "asc" }, { sortOrder: "asc" }],
        select: { id: true, defaultDriverId: true },
      }),
      driverLeaveRepo.listApprovedOn(date),
    ]);
    const leaveSet = new Set(onLeave.map((l) => l.driverId));
    return trucks.map((t) => {
      const onLv = t.defaultDriverId != null && leaveSet.has(t.defaultDriverId);
      return {
        truck: t.id,
        status: onLv ? "OFF-ND" : "ON",
        driverId: onLv ? null : t.defaultDriverId,
        time: "",
      };
    });
  },

  /** True once a date has saved rows. */
  async isMaterialised(date: Date): Promise<boolean> {
    return (await prisma.truckAssignment.count({ where: { date } })) > 0;
  },

  /** Write the full synthesised day if it isn't saved yet (idempotent). */
  async materialise(date: Date, userId: number | null): Promise<void> {
    if (await this.isMaterialised(date)) return;
    const rows = await this.synthesise(date);
    await prisma.truckAssignment.createMany({
      data: rows.map((r) => ({
        date,
        truckId: r.truck,
        status: r.status,
        driverId: r.driverId,
        time: r.time,
        createdByUserId: userId,
      })),
    });
  },

  /** Apply one or more truck changes for a date (materialises first). */
  async applyChanges(
    date: Date,
    changes: { truckId: string; status?: string; driverId?: number | null; time?: string | null }[],
    userId: number | null,
  ): Promise<void> {
    await this.materialise(date, userId);
    await prisma.$transaction(
      changes.map((c) =>
        prisma.truckAssignment.update({
          where: { date_truckId: { date, truckId: c.truckId } },
          data: {
            ...(c.status !== undefined ? { status: c.status } : {}),
            ...(c.driverId !== undefined ? { driverId: c.driverId } : {}),
            ...(c.time !== undefined ? { time: c.time } : {}),
            updatedByUserId: userId,
          },
        }),
      ),
    );
  },

  /** Drop approved-leave drivers from a saved day (used after leave approval). */
  async dropDriverFromRange(driverId: number, start: Date, end: Date): Promise<number> {
    const hit = await prisma.truckAssignment.updateMany({
      where: { driverId, date: { gte: start, lte: end } },
      data: { driverId: null, status: "OFF-ND" },
    });
    return hit.count;
  },

  /** Discard a day's edits — reverts to synthesis. */
  async resetDay(date: Date): Promise<void> {
    await prisma.truckAssignment.deleteMany({ where: { date } });
  },

  /** Dates that have been captured (saved), for history/reporting. */
  listCapturedDates(start: Date, end: Date) {
    return prisma.truckAssignment.findMany({
      where: { date: { gte: start, lte: end } },
      distinct: ["date"],
      select: { date: true },
      orderBy: { date: "asc" },
    });
  },

  /** All saved assignment rows in a range — the raw material for reports. */
  assignmentsInRange(start: Date, end: Date) {
    return prisma.truckAssignment.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, truckId: true, status: true, driverId: true },
    });
  },
};
