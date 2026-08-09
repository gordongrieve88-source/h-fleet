import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "../client";
import { driverLeaveRepo } from "./driver-leave.repo";

export interface FleetBoardRow {
  truck: string;
  status: string;
  driverId: number | null;
  time: string | null;
  /** The plant the truck works this day (imported), when it's saved. */
  workLocation: string | null;
}

/** What a driver move actually did — feeds the audit line. */
export interface MoveResult {
  /** Truck the driver really came from on this date (server truth), or null (pool). */
  from: string | null;
  /** Driver who was on the target truck and got moved back/off, or null. */
  displaced: number | null;
}

/** Either the shared client or the client bound to an open transaction. */
type Db = PrismaClient | Prisma.TransactionClient;

/** Concurrent first-edits of a day can both try to insert it; the loser hits
 *  the (date, truckId) unique constraint. One retry then sees the saved rows. */
async function retryOnUniqueClash<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const clash =
      (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") ||
      String(e).includes("UNIQUE constraint");
    if (!clash) throw e;
    return await fn();
  }
}

/**
 * The daily fleet board. A date with saved TruckAssignment rows returns those
 * (history); a date with none is synthesised from each truck's default driver
 * ("roll forward"), with anyone on approved leave dropped to "needs cover".
 * The first edit materialises the full day so it becomes saved history.
 *
 * Every write path runs inside ONE transaction (materialise + read + write),
 * so two dispatchers editing the same day can't interleave into a
 * double-assignment or a half-saved day.
 */
export const fleetBoardRepo = {
  async getBoard(date: Date, group: string | null = null): Promise<FleetBoardRow[]> {
    const saved = await prisma.truckAssignment.findMany({
      where: { date, ...(group === null ? {} : { truck: { depot: { dispatchGroupCode: group } } }) },
      select: { truckId: true, status: true, driverId: true, time: true, workLocation: true },
    });
    if (saved.length > 0) {
      return saved.map((a) => ({
        truck: a.truckId,
        status: a.status,
        driverId: a.driverId,
        time: a.time,
        workLocation: a.workLocation,
      }));
    }
    return this.synthesise(date, prisma, group);
  },

  async synthesise(date: Date, db: Db = prisma, group: string | null = null): Promise<FleetBoardRow[]> {
    const [trucks, onLeave] = await Promise.all([
      db.truck.findMany({
        where: { isActive: true, ...(group === null ? {} : { depot: { dispatchGroupCode: group } }) },
        orderBy: [{ region: "asc" }, { sortOrder: "asc" }],
        select: { id: true, defaultDriverId: true },
      }),
      driverLeaveRepo.listApprovedOn(date, db),
    ]);
    const leaveSet = new Set(onLeave.map((l) => l.driverId));
    return trucks.map((t) => {
      const onLv = t.defaultDriverId != null && leaveSet.has(t.defaultDriverId);
      return {
        truck: t.id,
        status: onLv ? "OFF-ND" : "ON",
        driverId: onLv ? null : t.defaultDriverId,
        time: "",
        workLocation: null,
      };
    });
  },

  /** True once a date has saved rows. */
  async isMaterialised(date: Date): Promise<boolean> {
    return (await prisma.truckAssignment.count({ where: { date } })) > 0;
  },

  /** Inside an open transaction: write the synthesised day if it isn't saved yet. */
  async ensureMaterialised(tx: Db, date: Date, userId: number | null): Promise<void> {
    const existing = await tx.truckAssignment.count({ where: { date } });
    if (existing > 0) return;
    const rows = await this.synthesise(date, tx);
    await tx.truckAssignment.createMany({
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

  /** Write the full synthesised day if it isn't saved yet (idempotent). */
  async materialise(date: Date, userId: number | null): Promise<void> {
    await retryOnUniqueClash(() =>
      prisma.$transaction(async (tx) => this.ensureMaterialised(tx, date, userId)),
    );
  },

  /** Apply one or more truck changes for a date (materialises first, atomically). */
  async applyChanges(
    date: Date,
    changes: { truckId: string; status?: string; driverId?: number | null; time?: string | null }[],
    userId: number | null,
  ): Promise<void> {
    await retryOnUniqueClash(() =>
      prisma.$transaction(async (tx) => {
        await this.ensureMaterialised(tx, date, userId);
        for (const c of changes) {
          await tx.truckAssignment.update({
            where: { date_truckId: { date, truckId: c.truckId } },
            data: {
              ...(c.status !== undefined ? { status: c.status } : {}),
              ...(c.driverId !== undefined ? { driverId: c.driverId } : {}),
              ...(c.time !== undefined ? { time: c.time } : {}),
              updatedByUserId: userId,
            },
          });
        }
      }),
    );
  },

  /**
   * Move a driver onto a truck — the whole read-compute-write in one
   * transaction. The driver's source truck comes from the SAVED day, not the
   * caller's (possibly stale) view, so concurrent dispatchers can't create a
   * double-assignment: every other row holding this driver is released, the
   * displaced driver swaps back to the real source truck, and landing on a
   * "driver not in" truck brings it back on road.
   */
  async moveDriver(date: Date, driverId: number, toTruck: string, userId: number | null): Promise<MoveResult> {
    return retryOnUniqueClash(() =>
      prisma.$transaction(async (tx) => {
        await this.ensureMaterialised(tx, date, userId);
        const target = await tx.truckAssignment.findUnique({
          where: { date_truckId: { date, truckId: toTruck } },
          select: { driverId: true, status: true },
        });
        if (!target) throw new Error("Unknown truck.");

        // Where is this driver on the saved day right now? (Defensively treat
        // "on several trucks" — a healed double-assignment — as source + extras.)
        const sources = await tx.truckAssignment.findMany({
          where: { date, driverId, truckId: { not: toTruck } },
          select: { truckId: true },
          orderBy: { truckId: "asc" },
        });
        const from = sources[0]?.truckId ?? null;
        const displaced = target.driverId === driverId ? null : target.driverId;

        await tx.truckAssignment.update({
          where: { date_truckId: { date, truckId: toTruck } },
          data: {
            driverId,
            // Landing a driver on a "driver not in" truck brings it back on road.
            ...(target.status === "OFF-ND" ? { status: "ON" } : {}),
            updatedByUserId: userId,
          },
        });
        for (const [i, s] of sources.entries()) {
          await tx.truckAssignment.update({
            where: { date_truckId: { date, truckId: s.truckId } },
            data: { driverId: i === 0 ? displaced : null, updatedByUserId: userId },
          });
        }
        return { from, displaced };
      }),
    );
  },

  /**
   * Apply a day's Syncrotess allocations in one transaction: start times
   * always; driver placements when `applyDrivers`. Every allocated driver is
   * first released from any other truck that day (the sheet is the whole
   * truth for the trucks it names), and landing on an OFF-ND truck brings it
   * back on road — same rule as a manual move.
   */
  async applyAllocations(
    date: Date,
    allocations: { truckId: string; driverId: number | null; time: string | null; workLocation?: string | null }[],
    applyDrivers: boolean,
    userId: number | null,
  ): Promise<{ timesSet: number; moves: number; locations: number }> {
    return retryOnUniqueClash(() =>
      prisma.$transaction(async (tx) => {
        await this.ensureMaterialised(tx, date, userId);

        if (applyDrivers) {
          const targetByDriver = new Map(
            allocations.filter((a) => a.driverId != null).map((a) => [a.driverId as number, a.truckId]),
          );
          if (targetByDriver.size > 0) {
            const holding = await tx.truckAssignment.findMany({
              where: { date, driverId: { in: [...targetByDriver.keys()] } },
              select: { truckId: true, driverId: true },
            });
            for (const h of holding) {
              if (targetByDriver.get(h.driverId as number) !== h.truckId) {
                await tx.truckAssignment.update({
                  where: { date_truckId: { date, truckId: h.truckId } },
                  data: { driverId: null, updatedByUserId: userId },
                });
              }
            }
          }
        }

        let timesSet = 0;
        let moves = 0;
        let locations = 0;
        for (const a of allocations) {
          const row = await tx.truckAssignment.findUnique({
            where: { date_truckId: { date, truckId: a.truckId } },
            select: { driverId: true, status: true, time: true, workLocation: true },
          });
          if (!row) continue; // unknown trucks are filtered before commit
          const data: { time?: string; driverId?: number; status?: string; workLocation?: string; updatedByUserId: number | null } = {
            updatedByUserId: userId,
          };
          if (a.time != null && a.time !== row.time) {
            data.time = a.time;
            timesSet++;
          }
          if (a.workLocation != null && a.workLocation !== row.workLocation) {
            data.workLocation = a.workLocation;
            locations++;
          }
          if (applyDrivers && a.driverId != null && row.driverId !== a.driverId) {
            data.driverId = a.driverId;
            if (row.status === "OFF-ND") data.status = "ON";
            moves++;
          }
          if (data.time !== undefined || data.driverId !== undefined || data.workLocation !== undefined) {
            await tx.truckAssignment.update({ where: { date_truckId: { date, truckId: a.truckId } }, data });
          }
        }
        return { timesSet, moves, locations };
      }),
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

  /** Rostered start times in a range — the plan side of punctuality. */
  startTimesInRange(start: Date, end: Date) {
    return prisma.truckAssignment.findMany({
      where: { date: { gte: start, lte: end }, time: { not: null } },
      select: { date: true, truckId: true, time: true },
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
