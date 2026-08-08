import { prisma } from "../client";
import { addDaysUTC, ymd } from "@/lib/wfm/date";

/**
 * The driver's own view of the roster — everything /me needs, scoped to one
 * driver. Read-only: self-service never writes to the board.
 */

export interface MyDay {
  dateKey: string;
  truck: string | null;
  status: string | null;
  time: string | null;
  workLocation: string | null;
  /** Approved leave code covering this day, if any. */
  leaveCode: string | null;
  /** False when the day is still a roll-forward projection, not saved. */
  captured: boolean;
}

export const selfServiceRepo = {
  /** The driver this sign-in account belongs to, if it's been linked. */
  driverForUser(userId: number) {
    return prisma.driver.findUnique({ where: { appUserId: userId }, include: { depot: true } });
  },

  /** App users available to link, newest last — for the Drivers admin picker. */
  listLinkableUsers() {
    return prisma.appUser.findMany({
      where: { isActive: true },
      select: { id: true, displayName: true, email: true, role: true, driver: { select: { id: true, name: true } } },
      orderBy: { displayName: "asc" },
    });
  },

  setDriverAccount(driverId: number, appUserId: number | null) {
    return prisma.driver.update({ where: { id: driverId }, data: { appUserId }, include: { appUser: true } });
  },

  /**
   * The driver's days across [start,end]. Saved days come from the board;
   * unsaved days roll forward from the trucks they're default driver of —
   * the same projection the board and week view show.
   */
  async myDays(driverId: number, start: Date, end: Date): Promise<MyDay[]> {
    const [saved, defaultTrucks, leave, capturedRows] = await Promise.all([
      prisma.truckAssignment.findMany({
        where: { driverId, date: { gte: start, lte: end } },
        select: { date: true, truckId: true, status: true, time: true, workLocation: true },
      }),
      prisma.truck.findMany({ where: { isActive: true, defaultDriverId: driverId }, select: { id: true } }),
      prisma.driverLeave.findMany({
        where: { driverId, status: "APPROVED", startDate: { lte: end }, endDate: { gte: start } },
        select: { startDate: true, endDate: true, leaveTypeCode: true },
      }),
      prisma.truckAssignment.findMany({
        where: { date: { gte: start, lte: end } },
        distinct: ["date"],
        select: { date: true },
      }),
    ]);

    const savedByDay = new Map(saved.map((r) => [ymd(r.date), r]));
    const capturedDays = new Set(capturedRows.map((r) => ymd(r.date)));
    const defaultTruck = defaultTrucks[0]?.id ?? null;

    const out: MyDay[] = [];
    for (let d = new Date(start); d <= end; d = addDaysUTC(d, 1)) {
      const dateKey = ymd(d);
      const onLeave = leave.find((l) => l.startDate <= d && l.endDate >= d);
      const row = savedByDay.get(dateKey);
      const captured = capturedDays.has(dateKey);

      if (row) {
        out.push({
          dateKey,
          truck: row.truckId,
          status: row.status,
          time: row.time,
          workLocation: row.workLocation,
          leaveCode: onLeave?.leaveTypeCode ?? null,
          captured,
        });
      } else {
        // No saved row: either the day isn't captured (project from defaults)
        // or it is captured and they simply aren't on it.
        const projected = !captured && !onLeave && defaultTruck !== null && d.getUTCDay() !== 0;
        out.push({
          dateKey,
          truck: projected ? defaultTruck : null,
          status: projected ? "ON" : null,
          time: null,
          workLocation: null,
          leaveCode: onLeave?.leaveTypeCode ?? null,
          captured,
        });
      }
    }
    return out;
  },

  /** This driver's leave from `since` onward, newest first. */
  myLeave(driverId: number, since: Date) {
    return prisma.driverLeave.findMany({
      where: { driverId, endDate: { gte: since } },
      include: { leaveType: true },
      orderBy: { startDate: "asc" },
    });
  },

  myCredentials(driverId: number) {
    return prisma.driverCredential.findMany({
      where: { driverId, type: { isActive: true } },
      include: { type: true },
      orderBy: { type: { sortOrder: "asc" } },
    });
  },
};
