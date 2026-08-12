import { prisma } from "../client";

/** Integration run history + the writes each connector performs. */
export const integrationRepo = {
  recentRuns(limit = 20) {
    return prisma.integrationRun.findMany({ orderBy: { startedAt: "desc" }, take: limit });
  },

  lastRun(connector: string) {
    return prisma.integrationRun.findFirst({
      where: { connector, dryRun: false, status: "OK" },
      orderBy: { startedAt: "desc" },
    });
  },

  recordRun(input: {
    connector: string;
    provider: string;
    isSample: boolean;
    dryRun: boolean;
    status: "OK" | "FAILED" | "PREVIEW";
    summary: string;
    detail?: unknown;
    triggeredByUserId: number | null;
  }) {
    return prisma.integrationRun.create({
      data: {
        connector: input.connector,
        provider: input.provider,
        isSample: input.isSample,
        dryRun: input.dryRun,
        status: input.status,
        summary: input.summary,
        detail: input.detail === undefined ? null : JSON.stringify(input.detail),
        finishedAt: new Date(),
        triggeredByUserId: input.triggeredByUserId,
      },
    });
  },

  // ---- people writes --------------------------------------------------------
  currentDrivers() {
    return prisma.driver.findMany({
      select: { id: true, employeeNo: true, name: true, depotId: true, workgroup: true, isActive: true, depot: { select: { name: true } } },
      orderBy: { id: "asc" },
    });
  },

  entitlements(year: number) {
    return prisma.driverEntitlement.findMany({
      where: { year },
      select: { driverId: true, leaveTypeCode: true, year: true, entitledDays: true, openingBalance: true },
    });
  },

  /** Apply a people diff in one transaction. */
  async applyPeople(input: {
    creates: { employeeNo: string; name: string; depotId: number; workgroup: string }[];
    updates: { driverId: number; data: { name?: string; depotId?: number; workgroup?: string; isActive?: boolean } }[];
    deactivates: number[];
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const c of input.creates) await tx.driver.create({ data: c });
      for (const u of input.updates) await tx.driver.update({ where: { id: u.driverId }, data: u.data });
      if (input.deactivates.length > 0) {
        await tx.driver.updateMany({ where: { id: { in: input.deactivates } }, data: { isActive: false } });
      }
    });
  },

  async applyBalances(
    rows: { driverId: number; leaveTypeCode: string; year: number; entitledDays: number; openingBalance: number }[],
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        await tx.driverEntitlement.upsert({
          where: { driverId_leaveTypeCode_year: { driverId: r.driverId, leaveTypeCode: r.leaveTypeCode, year: r.year } },
          create: r,
          update: { entitledDays: r.entitledDays, openingBalance: r.openingBalance },
        });
      }
    });
  },

  // ---- telematics writes ----------------------------------------------------
  async applyTelemetry(
    date: Date,
    rows: {
      truckId: string;
      actualStart: string | null;
      odometerKm?: number | null;
      engineHours?: number | null;
      faultCode?: string | null;
    }[],
    source: string,
    isSample: boolean,
  ): Promise<number> {
    const known = new Set((await prisma.truck.findMany({ select: { id: true } })).map((t) => t.id));
    const usable = rows.filter((r) => known.has(r.truckId));
    await prisma.$transaction(async (tx) => {
      for (const r of usable) {
        const data = {
          actualStart: r.actualStart,
          odometerKm: r.odometerKm ?? null,
          engineHours: r.engineHours ?? null,
          faultCode: r.faultCode ?? null,
          source,
          isSample,
        };
        await tx.truckTelemetry.upsert({
          where: { date_truckId: { date, truckId: r.truckId } },
          create: { date, truckId: r.truckId, ...data },
          update: data,
        });
      }
    });
    return usable.length;
  },

  telemetryForRange(start: Date, end: Date) {
    return prisma.truckTelemetry.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, truckId: true, actualStart: true, faultCode: true, isSample: true },
    });
  },

  telemetryForDay(date: Date) {
    return prisma.truckTelemetry.findMany({
      where: { date },
      select: { truckId: true, actualStart: true, faultCode: true, isSample: true },
    });
  },
};
