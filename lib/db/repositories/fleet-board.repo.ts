import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "../client";
import { driverLeaveRepo } from "./driver-leave.repo";
import { statusKind, isOnRoad, nextFto, truckOrder, TIMED_STATUS } from "@/lib/wfm/fleet";

export interface FleetBoardRow {
  truck: string;
  status: string;
  driverId: number | null;
  time: string | null;
  /** The plant the truck works this day (imported), when it's saved. */
  workLocation: string | null;
  /** Planned time behind a timed status (late start / early finish / service / dedag). */
  statusTime: string | null;
  /** First truck out of its plant this day — the board rotates the block to start here. */
  fto: boolean;
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
      select: { truckId: true, status: true, driverId: true, time: true, workLocation: true, statusTime: true, fto: true },
    });
    if (saved.length > 0) {
      return saved.map((a) => ({
        truck: a.truckId,
        status: a.status,
        driverId: a.driverId,
        time: a.time,
        workLocation: a.workLocation,
        statusTime: a.statusTime,
        fto: a.fto,
      }));
    }
    return this.synthesise(date, prisma, group);
  },

  async synthesise(date: Date, db: Db = prisma, group: string | null = null): Promise<FleetBoardRow[]> {
    const [trucks, onLeave, lastSaved, lastFto] = await Promise.all([
      db.truck.findMany({
        where: { isActive: true, ...(group === null ? {} : { depot: { dispatchGroupCode: group } }) },
        orderBy: [{ region: "asc" }, { sortOrder: "asc" }],
        select: { id: true, defaultDriverId: true, block: true },
      }),
      driverLeaveRepo.listApprovedOn(date, db),
      // Each truck's most recent saved row before this date — a breakdown
      // stays planned off day after day until a dispatcher plans it back on.
      db.truckAssignment.findMany({
        where: { date: { lt: date } },
        orderBy: [{ date: "desc" }],
        distinct: ["truckId"],
        select: { truckId: true, status: true },
      }),
      // Each truck's most recent day as first-truck-out — the anchor the
      // cyclical roster advances from.
      db.truckAssignment.findMany({
        where: { fto: true, date: { lt: date } },
        orderBy: [{ date: "desc" }],
        distinct: ["truckId"],
        select: { truckId: true, date: true },
      }),
    ]);
    const leaveSet = new Set(onLeave.map((l) => l.driverId));
    const brokenDown = new Set(lastSaved.filter((s) => s.status === "OFF-BD").map((s) => s.truckId));
    const rows = trucks.map((t) => {
      if (brokenDown.has(t.id)) {
        return { truck: t.id, status: "OFF-BD", driverId: null, time: "", workLocation: null, statusTime: null, fto: false };
      }
      const onLv = t.defaultDriverId != null && leaveSet.has(t.defaultDriverId);
      return {
        truck: t.id,
        status: onLv ? "OFF-ND" : "ON",
        driverId: onLv ? null : t.defaultDriverId,
        time: "",
        workLocation: null,
        statusTime: null,
        fto: false,
      };
    });

    // First truck out, per plant: advance the cycle one position per day
    // from the block's last saved FTO, skipping trucks that are off today.
    const rowByTruck = new Map(rows.map((r) => [r.truck, r]));
    const ftoDateByTruck = new Map(lastFto.map((f) => [f.truckId, f.date]));
    const byBlock = new Map<string, string[]>();
    for (const t of trucks) {
      byBlock.set(t.block, [...(byBlock.get(t.block) ?? []), t.id]);
    }
    for (const members of byBlock.values()) {
      const sorted = [...members].sort(truckOrder);
      let prevTruck: string | null = null;
      let prevDate: Date | null = null;
      for (const id of sorted) {
        const d = ftoDateByTruck.get(id);
        if (d && (prevDate === null || d > prevDate)) {
          prevDate = d;
          prevTruck = id;
        }
      }
      const daysSince = prevDate ? Math.round((date.getTime() - prevDate.getTime()) / 86_400_000) : 1;
      const fto = nextFto(sorted, prevTruck, daysSince, (id) => isOnRoad(rowByTruck.get(id)?.status ?? "OFF"));
      if (fto) rowByTruck.get(fto)!.fto = true;
    }
    return rows;
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
        fto: r.fto,
        createdByUserId: userId,
      })),
    });
  },

  /**
   * Re-seat a block's first-truck-out marker for one saved day: if the
   * marked truck is off (or nothing is marked), the next on-road truck in
   * the alphanumeric cycle steps up. No-op while the marker is on road.
   */
  async recomputeFto(tx: Db, date: Date, block: string): Promise<void> {
    const members = await tx.truck.findMany({ where: { block, isActive: true }, select: { id: true } });
    const ids = members.map((m) => m.id).sort(truckOrder);
    if (ids.length === 0) return;
    const rows = await tx.truckAssignment.findMany({
      where: { date, truckId: { in: ids } },
      select: { truckId: true, status: true, fto: true },
    });
    const byId = new Map(rows.map((r) => [r.truckId, r]));
    const current = rows.find((r) => r.fto) ?? null;
    if (current && isOnRoad(current.status)) return;
    const fto = nextFto(ids, current?.truckId ?? null, 1, (id) => isOnRoad(byId.get(id)?.status ?? "OFF"));
    if (current && current.truckId !== fto) {
      await tx.truckAssignment.update({ where: { date_truckId: { date, truckId: current.truckId } }, data: { fto: false } });
    }
    if (fto && fto !== current?.truckId) {
      await tx.truckAssignment.update({ where: { date_truckId: { date, truckId: fto } }, data: { fto: true } });
    }
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
    changes: { truckId: string; status?: string; driverId?: number | null; time?: string | null; statusTime?: string | null }[],
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
              ...(c.statusTime !== undefined ? { statusTime: c.statusTime } : {}),
              updatedByUserId: userId,
            },
          });
        }
      }),
    );
  },

  /**
   * Hand first-truck-out to a specific truck for one day (dispatcher's
   * override of the cycle). The truck must be on road; the block's previous
   * marker is cleared. Tomorrow's cycle advances from here — the override
   * becomes the new anchor.
   */
  async setFto(date: Date, truckId: string, userId: number | null): Promise<void> {
    await retryOnUniqueClash(() =>
      prisma.$transaction(async (tx) => {
        await this.ensureMaterialised(tx, date, userId);
        const row = await tx.truckAssignment.findUnique({
          where: { date_truckId: { date, truckId } },
          select: { status: true, fto: true },
        });
        if (!row) throw new Error("Unknown truck.");
        if (!isOnRoad(row.status)) throw new Error(`${truckId} is ${row.status} — first truck out must be on road.`);
        if (row.fto) return;
        const truck = await tx.truck.findUnique({ where: { id: truckId }, select: { block: true } });
        const members = await tx.truck.findMany({ where: { block: truck?.block ?? "" }, select: { id: true } });
        await tx.truckAssignment.updateMany({
          where: { date, truckId: { in: members.map((m) => m.id) }, fto: true },
          data: { fto: false, updatedByUserId: userId },
        });
        await tx.truckAssignment.update({
          where: { date_truckId: { date, truckId } },
          data: { fto: true, updatedByUserId: userId },
        });
      }),
    );
  },

  /**
   * Change a truck's status with the board rules applied, in one transaction:
   *
   *   - any OFF* status releases the driver (they drop to the spares rail);
   *   - a status that isn't a timed one clears its planned time;
   *   - OFF-BD (breakdown) also plans the truck off on every LATER saved day
   *     — unsaved days inherit it via synthesise() until it's planned back on;
   *   - leaving OFF-BD frees those later saved days: each gets its default
   *     driver back when they're free that day (ON), otherwise OFF-ND.
   */
  async setStatus(
    date: Date,
    truckId: string,
    status: string,
    userId: number | null,
  ): Promise<{ prior: string; clearedDriver: number | null; futureDaysPlanned: number }> {
    return retryOnUniqueClash(() =>
      prisma.$transaction(async (tx) => {
        await this.ensureMaterialised(tx, date, userId);
        const row = await tx.truckAssignment.findUnique({
          where: { date_truckId: { date, truckId } },
          select: { status: true, driverId: true },
        });
        if (!row) throw new Error("Unknown truck.");

        const goingOff = statusKind(status) === "off";
        await tx.truckAssignment.update({
          where: { date_truckId: { date, truckId } },
          data: {
            status,
            ...(goingOff ? { driverId: null } : {}),
            ...(status in TIMED_STATUS ? {} : { statusTime: null }),
            updatedByUserId: userId,
          },
        });

        const truck = await tx.truck.findUnique({ where: { id: truckId }, select: { defaultDriverId: true, block: true } });

        let futureDaysPlanned = 0;
        if (status === "OFF-BD") {
          // Plan the breakdown into every already-saved later day. Days that
          // aren't saved yet inherit OFF-BD when they synthesise.
          const futureDays = await tx.truckAssignment.findMany({
            where: { truckId, date: { gt: date } },
            select: { date: true },
          });
          const hit = await tx.truckAssignment.updateMany({
            where: { truckId, date: { gt: date } },
            data: { status: "OFF-BD", driverId: null, statusTime: null, fto: false, updatedByUserId: userId },
          });
          futureDaysPlanned = hit.count;
          // The broken truck can't lead any of those days — re-seat markers.
          if (truck) {
            for (const day of futureDays) await this.recomputeFto(tx, day.date, truck.block);
          }
        } else if (row.status === "OFF-BD") {
          // Planned back on: release later saved days still marked broken.
          const stillBroken = await tx.truckAssignment.findMany({
            where: { truckId, date: { gt: date }, status: "OFF-BD" },
            select: { date: true },
            orderBy: { date: "asc" },
          });
          for (const day of stillBroken) {
            let driverId: number | null = null;
            if (truck?.defaultDriverId != null) {
              const [takenElsewhere, onLeave] = await Promise.all([
                tx.truckAssignment.count({ where: { date: day.date, driverId: truck.defaultDriverId } }),
                driverLeaveRepo.listApprovedOn(day.date, tx),
              ]);
              const free = takenElsewhere === 0 && !onLeave.some((l) => l.driverId === truck.defaultDriverId);
              driverId = free ? truck.defaultDriverId : null;
            }
            await tx.truckAssignment.update({
              where: { date_truckId: { date: day.date, truckId } },
              data: { status: driverId != null ? "ON" : "OFF-ND", driverId, updatedByUserId: userId },
            });
            futureDaysPlanned++;
          }
        }

        // Whatever changed, this day's first-truck-out must sit on a truck
        // that's actually on road — an off FTO hands its turn to the next.
        if (truck) await this.recomputeFto(tx, date, truck.block);

        return { prior: row.status, clearedDriver: goingOff ? row.driverId : null, futureDaysPlanned };
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

  /**
   * Drop a driver off every SAVED day in a range (leave booked or approved):
   * their trucks go OFF-ND, planned times clear, and a truck that was the
   * plant's first-truck-out hands the marker on. Returns what was affected so
   * callers can tell the allocators. Unsaved days need nothing — synthesis
   * drops approved leave by itself.
   */
  async dropDriverFromRange(driverId: number, start: Date, end: Date): Promise<{ date: Date; truckId: string }[]> {
    return retryOnUniqueClash(() =>
      prisma.$transaction(async (tx) => {
        const affected = await tx.truckAssignment.findMany({
          where: { driverId, date: { gte: start, lte: end } },
          select: { date: true, truckId: true, truck: { select: { block: true } } },
        });
        if (affected.length === 0) return [];
        await tx.truckAssignment.updateMany({
          where: { driverId, date: { gte: start, lte: end } },
          data: { driverId: null, status: "OFF-ND", statusTime: null },
        });
        for (const a of affected) {
          await this.recomputeFto(tx, a.date, a.truck.block);
        }
        return affected.map((a) => ({ date: a.date, truckId: a.truckId }));
      }),
    );
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
