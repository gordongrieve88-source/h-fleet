import { prisma } from "../client";
import { isOnRoad } from "@/lib/wfm/fleet";
import { ymd, addDaysUTC } from "@/lib/wfm/date";

/**
 * Rostering compliance data — driver credentials (licences, medicals,
 * inductions) and the worked-day history that feeds the fatigue flags.
 */
export const complianceRepo = {
  // ---- credential types (Setup) --------------------------------------------
  listTypes() {
    return prisma.credentialType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  },
  /** Every type, with how many drivers hold it — Setup needs the count to
   *  warn before a removal deletes those records too. */
  listAllTypes() {
    return prisma.credentialType.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { credentials: true } } },
    });
  },
  createType(data: {
    code: string;
    name: string;
    kind: string;
    category: string;
    severity: string;
    warnDays: number;
    requiredForTruckType: string | null;
    sortOrder: number;
  }) {
    return prisma.credentialType.create({ data });
  },
  updateType(
    code: string,
    data: {
      name: string;
      kind: string;
      category: string;
      severity: string;
      warnDays: number;
      requiredForTruckType: string | null;
      sortOrder: number;
    },
  ) {
    return prisma.credentialType.update({ where: { code }, data });
  },
  setTypeActive(code: string, isActive: boolean) {
    return prisma.credentialType.update({ where: { code }, data: { isActive } });
  },

  /**
   * Delete a credential type outright, along with every driver's record of
   * holding it. Destructive and irreversible — Setup offers "Hide" for the
   * common case of retiring a type while keeping its history.
   */
  async deleteType(code: string): Promise<{ name: string; heldBy: number }> {
    return prisma.$transaction(async (tx) => {
      const type = await tx.credentialType.findUnique({ where: { code } });
      if (!type) throw new Error("That credential no longer exists.");
      const heldBy = await tx.driverCredential.count({ where: { typeCode: code } });
      await tx.driverCredential.deleteMany({ where: { typeCode: code } });
      await tx.credentialType.delete({ where: { code } });
      return { name: type.name, heldBy };
    });
  },

  // ---- driver credentials ---------------------------------------------------
  listAllCredentials() {
    return prisma.driverCredential.findMany({
      include: { driver: { include: { depot: true } }, type: true },
      orderBy: [{ driver: { name: "asc" } }, { typeCode: "asc" }],
    });
  },
  /** Credentials for a set of drivers (doctor checks) — active types only. */
  forDrivers(driverIds: number[]) {
    if (driverIds.length === 0) return Promise.resolve([]);
    return prisma.driverCredential.findMany({
      where: { driverId: { in: driverIds }, type: { isActive: true } },
      include: { type: true },
    });
  },
  getCredential(id: number) {
    return prisma.driverCredential.findUnique({ where: { id }, include: { driver: true, type: true } });
  },
  /** One row per driver/type — renewals update the expiry in place. */
  upsertCredential(input: { driverId: number; typeCode: string; reference: string | null; expiresOn: Date | null; notes: string | null }) {
    const data = { reference: input.reference, expiresOn: input.expiresOn, notes: input.notes };
    return prisma.driverCredential.upsert({
      where: { driverId_typeCode: { driverId: input.driverId, typeCode: input.typeCode } },
      create: { driverId: input.driverId, typeCode: input.typeCode, ...data },
      update: data,
      include: { driver: true, type: true },
    });
  },
  deleteCredential(id: number) {
    return prisma.driverCredential.delete({ where: { id }, include: { driver: true, type: true } });
  },

  /** Expired credentials whose type BLOCKS rostering — the move-time gate. */
  expiredBlocking(driverId: number, today: Date) {
    return prisma.driverCredential.findMany({
      where: {
        driverId,
        expiresOn: { lt: today },
        type: { isActive: true, severity: "BLOCK" },
      },
      include: { type: true },
    });
  },

  /**
   * Competencies this truck type demands that the driver doesn't hold — the
   * second move-time gate ("can they drive this kind of truck?").
   */
  async missingForTruckType(driverId: number, truckType: string) {
    const required = await prisma.credentialType.findMany({
      where: { isActive: true, requiredForTruckType: truckType },
    });
    if (required.length === 0) return [];
    const held = new Set(
      (
        await prisma.driverCredential.findMany({
          where: { driverId, typeCode: { in: required.map((r) => r.code) } },
          select: { typeCode: true },
        })
      ).map((c) => c.typeCode),
    );
    return required.filter((r) => !held.has(r.code));
  },

  /** Everything a driver holds, plus every active type — the profile view. */
  async profileFor(driverId: number) {
    const [types, held] = await Promise.all([
      prisma.credentialType.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
      prisma.driverCredential.findMany({ where: { driverId }, select: { typeCode: true, expiresOn: true, reference: true } }),
    ]);
    const heldByCode = new Map(held.map((h) => [h.typeCode, h]));
    return types.map((t) => ({
      code: t.code,
      name: t.name,
      kind: t.kind as "EXPIRY" | "TICKBOX",
      category: t.category,
      severity: t.severity,
      warnDays: t.warnDays,
      requiredForTruckType: t.requiredForTruckType,
      held: heldByCode.has(t.code),
      expiresOn: heldByCode.get(t.code)?.expiresOn ?? null,
      reference: heldByCode.get(t.code)?.reference ?? null,
    }));
  },

  /** Grant or revoke a tick-box competency. */
  async setTickbox(driverId: number, typeCode: string, held: boolean) {
    if (held) {
      await prisma.driverCredential.upsert({
        where: { driverId_typeCode: { driverId, typeCode } },
        create: { driverId, typeCode },
        update: {},
      });
    } else {
      await prisma.driverCredential.deleteMany({ where: { driverId, typeCode } });
    }
  },

  /** Distinct truck types in the fleet — the options for requiredForTruckType. */
  async truckTypes(): Promise<string[]> {
    const rows = await prisma.truck.findMany({ distinct: ["type"], select: { type: true }, orderBy: { type: "asc" } });
    return rows.map((r) => r.type).filter(Boolean);
  },

  /**
   * Per-driver sets of worked day-keys in [start, end] — the fatigue-run
   * input. A captured day counts a driver if they're on an on-road truck; an
   * uncaptured day rolls forward (default drivers of active trucks, minus
   * approved leave) exactly like the board itself — except Sundays, which
   * the fleet doesn't operate (same rule as the approvals coverage maths).
   * A CAPTURED Sunday still counts: if someone really worked it, it's real.
   */
  async workedDaySets(start: Date, end: Date): Promise<Map<number, Set<string>>> {
    const [saved, trucks, leave] = await Promise.all([
      prisma.truckAssignment.findMany({
        where: { date: { gte: start, lte: end } },
        select: { date: true, driverId: true, status: true },
      }),
      prisma.truck.findMany({ where: { isActive: true, defaultDriverId: { not: null } }, select: { defaultDriverId: true } }),
      prisma.driverLeave.findMany({
        where: { status: "APPROVED", startDate: { lte: end }, endDate: { gte: start } },
        select: { driverId: true, startDate: true, endDate: true },
      }),
    ]);

    const capturedDays = new Set(saved.map((r) => ymd(r.date)));
    const defaultDrivers = [...new Set(trucks.map((t) => t.defaultDriverId as number))];

    const onLeave = (driverId: number, day: Date) =>
      leave.some((l) => l.driverId === driverId && l.startDate <= day && l.endDate >= day);

    const out = new Map<number, Set<string>>();
    const add = (driverId: number, key: string) => {
      let set = out.get(driverId);
      if (!set) out.set(driverId, (set = new Set()));
      set.add(key);
    };

    for (const r of saved) {
      if (r.driverId != null && isOnRoad(r.status)) add(r.driverId, ymd(r.date));
    }
    for (let day = new Date(start); day <= end; day = addDaysUTC(day, 1)) {
      const key = ymd(day);
      if (capturedDays.has(key)) continue;
      if (day.getUTCDay() === 0) continue; // no Sunday operations
      for (const driverId of defaultDrivers) {
        if (!onLeave(driverId, day)) add(driverId, key);
      }
    }
    return out;
  },
};
