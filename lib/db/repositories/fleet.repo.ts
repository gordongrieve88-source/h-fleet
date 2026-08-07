import { prisma } from "../client";

/**
 * Fleet master data — regions, depots, drivers, trucks. Split per use:
 * list… (active, for the catalog) and listAll…/save…/setActive (admin).
 */
export const fleetRepo = {
  // ---- catalog (active records, for the board / planner / pickers) ----------
  listRegions() {
    return prisma.fleetRegion.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  },
  listDepots() {
    return prisma.depot.findMany({
      where: { isActive: true },
      orderBy: [{ region: { sortOrder: "asc" } }, { name: "asc" }],
      include: { _count: { select: { trucks: true, drivers: true } } },
    });
  },
  listDrivers() {
    return prisma.driver.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { depot: true },
    });
  },
  listTrucks() {
    return prisma.truck.findMany({
      where: { isActive: true },
      orderBy: [{ region: "asc" }, { sortOrder: "asc" }],
      include: { depot: true },
    });
  },

  // ---- admin (active + inactive, with counts) --------------------------------
  listAllDrivers() {
    return prisma.driver.findMany({
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

  listAllTrucks() {
    return prisma.truck.findMany({
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

  listAllDepots() {
    return prisma.depot.findMany({
      orderBy: [{ isActive: "desc" }, { region: { sortOrder: "asc" } }, { name: "asc" }],
      include: { region: true, _count: { select: { drivers: true, trucks: true } } },
    });
  },
  createDepot(d: { name: string; regionName: string }) {
    return prisma.depot.create({ data: d });
  },
  updateDepot(id: number, d: { name: string; regionName: string }) {
    return prisma.depot.update({ where: { id }, data: d });
  },
  setDepotActive(id: number, isActive: boolean) {
    return prisma.depot.update({ where: { id }, data: { isActive } });
  },

  listAllRegions() {
    return prisma.fleetRegion.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { depots: true } } },
    });
  },
  async createRegion(name: string) {
    const max = await prisma.fleetRegion.aggregate({ _max: { sortOrder: true } });
    return prisma.fleetRegion.create({ data: { name, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  },
  setRegionActive(name: string, isActive: boolean) {
    return prisma.fleetRegion.update({ where: { name }, data: { isActive } });
  },
};
