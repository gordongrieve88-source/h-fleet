import { prisma } from "../client";

/**
 * Timesheet source data: the SAVED board only. Roll-forward projections are
 * never exported — a timesheet must be evidence of what was rostered, not a
 * guess. H-Fleet still computes no pay; this is roster fact for payroll to
 * reconcile against.
 */
export const timesheetRepo = {
  rows(start: Date, end: Date, depotIds: number[] | null) {
    return prisma.truckAssignment.findMany({
      where: {
        date: { gte: start, lte: end },
        driverId: { not: null },
        ...(depotIds ? { truck: { depotId: { in: depotIds } } } : {}),
      },
      select: {
        date: true,
        truckId: true,
        status: true,
        time: true,
        workLocation: true,
        driver: { select: { name: true, employeeNo: true, depot: { select: { name: true } } } },
        truck: { select: { depot: { select: { name: true } }, region: true } },
      },
      orderBy: [{ date: "asc" }, { truckId: "asc" }],
    });
  },
};
