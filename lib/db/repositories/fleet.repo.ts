import { prisma } from "../client";

/** Narrow a depot-derived query to one dispatch group; null = all groups. */
type Group = string | null;
const inGroup = (g: Group) => (g === null ? {} : { dispatchGroupCode: g });
const truckInGroup = (g: Group) => (g === null ? {} : { depot: { dispatchGroupCode: g } });

/**
 * Fleet master data — regions, depots, drivers, trucks. Split per use:
 * list… (active, for the catalog) and listAll…/save…/setActive (admin).
 */
export const fleetRepo = {
  // ---- catalog (active records, for the board / planner / pickers) ----------
  listRegions() {
    return prisma.fleetRegion.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  },
  listDepots(group: Group = null) {
    return prisma.depot.findMany({
      where: { isActive: true, ...inGroup(group) },
      orderBy: [{ region: { sortOrder: "asc" } }, { name: "asc" }],
      include: { _count: { select: { trucks: true, drivers: true } } },
    });
  },
  listDrivers(group: Group = null) {
    return prisma.driver.findMany({
      where: { isActive: true, ...truckInGroup(group) },
      orderBy: { name: "asc" },
      include: { depot: true },
    });
  },
  listTrucks(group: Group = null) {
    return prisma.truck.findMany({
      where: { isActive: true, ...truckInGroup(group) },
      orderBy: [{ region: "asc" }, { sortOrder: "asc" }],
      include: { depot: true },
    });
  },

  // ---- admin (active + inactive, with counts) --------------------------------
  listAllDrivers(group: Group = null) {
    return prisma.driver.findMany({
      where: truckInGroup(group),
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { depot: true, _count: { select: { defaultTrucks: true } } },
    });
  },
  createDriver(d: { employeeNo: string; name: string; depotId: number; workgroup: string }) {
    return prisma.driver.create({ data: d });
  },
  updateDriver(id: number, d: { employeeNo: string; name: string; depotId: number; workgroup: string }) {
    return prisma.driver.update({ where: { id }, data: d });
  },
  setDriverActive(id: number, isActive: boolean) {
    return prisma.driver.update({ where: { id }, data: { isActive } });
  },
  getDriver(id: number) {
    return prisma.driver.findUnique({ where: { id }, include: { depot: true } });
  },

  listAllTrucks(group: Group = null) {
    return prisma.truck.findMany({
      where: truckInGroup(group),
      orderBy: [{ isActive: "desc" }, { region: "asc" }, { sortOrder: "asc" }],
      include: { depot: true, defaultDriver: true },
    });
  },
  createTruck(t: { id: string; depotId: number; region: string; block: string; type: string; defaultDriverId: number | null }) {
    return prisma.truck.create({ data: t });
  },
  updateTruck(id: string, t: { depotId: number; region: string; block: string; type: string; defaultDriverId: number | null }) {
    return prisma.truck.update({ where: { id }, data: t });
  },
  setTruckActive(id: string, isActive: boolean) {
    return prisma.truck.update({ where: { id }, data: { isActive } });
  },
  getTruck(id: string) {
    return prisma.truck.findUnique({ where: { id }, include: { depot: true } });
  },

  // ---- driver profile (onboarding checklist) --------------------------------
  // The field catalog mirrors the business's Onboarding Checklist workbook;
  // values hang off each driver. Managed in Setup, filled in on the driver's
  // profile page.
  listAllProfileFields() {
    return prisma.driverProfileField.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: { _count: { select: { values: true } } },
    });
  },
  async createProfileField(d: { code: string; label: string; section: string; kind: string }) {
    const max = await prisma.driverProfileField.aggregate({ _max: { sortOrder: true } });
    return prisma.driverProfileField.create({ data: { ...d, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  },
  updateProfileField(code: string, d: { label: string; section: string; kind: string; sortOrder?: number }) {
    return prisma.driverProfileField.update({ where: { code }, data: d });
  },
  setProfileFieldActive(code: string, isActive: boolean) {
    return prisma.driverProfileField.update({ where: { code }, data: { isActive } });
  },
  /** Delete a checklist field and every driver's answer to it. */
  async deleteProfileField(code: string) {
    const field = await prisma.driverProfileField.findUnique({
      where: { code },
      include: { _count: { select: { values: true } } },
    });
    if (!field) throw new Error(`Unknown profile field ${code}.`);
    await prisma.driverProfileField.delete({ where: { code } });
    return { label: field.label, answers: field._count.values };
  },
  /**
   * One driver's profile: every offerable field (active, plus inactive ones
   * this driver has an answer for — retiring a field shouldn't hide history)
   * with the driver's value, grouped in catalog order.
   */
  async driverProfile(driverId: number) {
    const [fields, values] = await Promise.all([
      prisma.driverProfileField.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
      prisma.driverProfileValue.findMany({ where: { driverId } }),
    ]);
    const byCode = new Map(values.map((v) => [v.fieldCode, v.value]));
    return fields
      .filter((f) => f.isActive || byCode.has(f.code))
      .map((f) => ({ code: f.code, label: f.label, section: f.section, kind: f.kind, value: byCode.get(f.code) ?? "" }));
  },
  /** Write one driver's answers: empty string clears, anything else upserts. */
  async saveDriverProfileValues(driverId: number, entries: { fieldCode: string; value: string }[]) {
    for (const { fieldCode, value } of entries) {
      if (value === "") {
        await prisma.driverProfileValue.deleteMany({ where: { driverId, fieldCode } });
      } else {
        await prisma.driverProfileValue.upsert({
          where: { driverId_fieldCode: { driverId, fieldCode } },
          create: { driverId, fieldCode, value },
          update: { value },
        });
      }
    }
  },

  // ---- truck properties -----------------------------------------------------
  // The tick boxes under each truck's setup. Catalog managed in Setup; ticked
  // per truck on the Trucks screen.
  listAllTruckProperties() {
    return prisma.truckProperty.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { trucks: true } } },
    });
  },
  async createTruckProperty(code: string, name: string) {
    const max = await prisma.truckProperty.aggregate({ _max: { sortOrder: true } });
    return prisma.truckProperty.create({ data: { code, name, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  },
  updateTruckProperty(code: string, d: { name: string; sortOrder?: number }) {
    return prisma.truckProperty.update({ where: { code }, data: d });
  },
  setTruckPropertyActive(code: string, isActive: boolean) {
    return prisma.truckProperty.update({ where: { code }, data: { isActive } });
  },
  /** Delete a property and every truck's tick of it. */
  async deleteTruckProperty(code: string) {
    const property = await prisma.truckProperty.findUnique({
      where: { code },
      include: { _count: { select: { trucks: true } } },
    });
    if (!property) throw new Error(`Unknown truck property ${code}.`);
    await prisma.truckProperty.delete({ where: { code } });
    return { name: property.name, tickedBy: property._count.trucks };
  },
  /**
   * The property panel for one truck: every offerable property (active, plus
   * inactive ones this truck already carries — hiding a property shouldn't
   * silently untick it) with whether this truck has it.
   */
  async truckProperties(truckId: string) {
    const [all, mine] = await Promise.all([
      prisma.truckProperty.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.truckOnProperty.findMany({ where: { truckId }, select: { propertyCode: true } }),
    ]);
    const held = new Set(mine.map((m) => m.propertyCode));
    return all
      .filter((p) => p.isActive || held.has(p.code))
      .map((p) => ({ code: p.code, name: p.name, isActive: p.isActive, held: held.has(p.code) }));
  },
  async setTruckProperty(truckId: string, propertyCode: string, held: boolean) {
    if (held) {
      await prisma.truckOnProperty.upsert({
        where: { truckId_propertyCode: { truckId, propertyCode } },
        create: { truckId, propertyCode },
        update: {},
      });
    } else {
      await prisma.truckOnProperty.deleteMany({ where: { truckId, propertyCode } });
    }
  },

  listAllDepots(group: Group = null) {
    return prisma.depot.findMany({
      where: inGroup(group),
      orderBy: [{ isActive: "desc" }, { region: { sortOrder: "asc" } }, { name: "asc" }],
      include: { region: true, dispatchGroup: true, _count: { select: { drivers: true, trucks: true } } },
    });
  },
  createDepot(d: { name: string; regionName: string; state?: string; dispatchGroupCode?: string | null }) {
    return prisma.depot.create({ data: d });
  },
  updateDepot(id: number, d: { name: string; regionName: string; state?: string; dispatchGroupCode?: string | null }) {
    return prisma.depot.update({ where: { id }, data: d });
  },
  setDepotActive(id: number, isActive: boolean) {
    return prisma.depot.update({ where: { id }, data: { isActive } });
  },

  listAllDispatchGroups() {
    return prisma.dispatchGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: { _count: { select: { depots: true } } },
    });
  },
  createDispatchGroup(d: { code: string; name: string; state: string; sortOrder?: number }) {
    return prisma.dispatchGroup.create({ data: d });
  },
  updateDispatchGroup(code: string, d: { name: string; state: string; sortOrder?: number }) {
    return prisma.dispatchGroup.update({ where: { code }, data: d });
  },
  setDispatchGroupActive(code: string, isActive: boolean) {
    return prisma.dispatchGroup.update({ where: { code }, data: { isActive } });
  },
  /**
   * Delete a group outright. Refuses while depots still point at it — the
   * relation is onDelete: SetNull, so deleting anyway would quietly orphan
   * them out of every group view instead of failing loudly. Move the depots
   * first, or deactivate the group to keep the link.
   */
  async deleteDispatchGroup(code: string) {
    const group = await prisma.dispatchGroup.findUnique({
      where: { code },
      include: { _count: { select: { depots: true } } },
    });
    if (!group) throw new Error(`Unknown dispatch group ${code}.`);
    if (group._count.depots > 0) {
      throw new Error(
        `${code} still has ${group._count.depots} depot${group._count.depots === 1 ? "" : "s"}. ` +
          `Move them to another group first, or deactivate ${code} instead.`,
      );
    }
    await prisma.dispatchGroup.delete({ where: { code } });
    return group;
  },

  listAllRegions() {
    return prisma.fleetRegion.findMany({
      orderBy: [{ dispatchGroupCode: "asc" }, { sortOrder: "asc" }],
      include: { _count: { select: { depots: true } } },
    });
  },
  async createRegion(name: string, dispatchGroupCode: string | null = null) {
    const max = await prisma.fleetRegion.aggregate({ _max: { sortOrder: true } });
    return prisma.fleetRegion.create({ data: { name, dispatchGroupCode, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  },
  setRegionActive(name: string, isActive: boolean) {
    return prisma.fleetRegion.update({ where: { name }, data: { isActive } });
  },
};
