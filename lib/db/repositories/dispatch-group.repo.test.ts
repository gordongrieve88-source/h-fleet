import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { applyMigrations, wipeData } from "@/test/db";
import { fleetRepo } from "./fleet.repo";
import { fleetBoardRepo } from "./fleet-board.repo";
import { loadFleetCatalog } from "@/lib/fleet/catalog";
import { dateFromKey } from "@/lib/wfm/date";

/**
 * Dispatch-group filtering: selecting a group narrows every depot-derived
 * screen to it, and "all groups" still shows the whole business.
 */
const DAY = dateFromKey("2026-08-05");

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  await prisma.leaveType.create({ data: { code: "AL", name: "Annual leave" } });
  await prisma.dispatchGroup.createMany({
    data: [
      { code: "301", name: "NSW Conc", state: "NSW", sortOrder: 1 },
      { code: "401", name: "VIC Conc", state: "VIC", sortOrder: 2 },
    ],
  });
  await prisma.fleetRegion.createMany({ data: [{ name: "Metro" }, { name: "South" }] });

  const nsw = await prisma.depot.create({ data: { name: "Greenacre", regionName: "Metro", state: "NSW", dispatchGroupCode: "301" } });
  const vic = await prisma.depot.create({ data: { name: "Laverton", regionName: "South", state: "VIC", dispatchGroupCode: "401" } });
  const orphan = await prisma.depot.create({ data: { name: "Unassigned Yard", regionName: "Metro", state: "NSW" } });

  const d1 = await prisma.driver.create({ data: { name: "NSW Driver", employeeNo: "N1", depotId: nsw.id } });
  const d2 = await prisma.driver.create({ data: { name: "VIC Driver", employeeNo: "V1", depotId: vic.id } });
  await prisma.driver.create({ data: { name: "Orphan Driver", employeeNo: "O1", depotId: orphan.id } });

  await prisma.truck.create({ data: { id: "NSW1", depotId: nsw.id, region: "Metro", block: "B", defaultDriverId: d1.id } });
  await prisma.truck.create({ data: { id: "NSW2", depotId: nsw.id, region: "Metro", block: "B" } });
  await prisma.truck.create({ data: { id: "VIC1", depotId: vic.id, region: "South", block: "B", defaultDriverId: d2.id } });
});

describe("master data narrows to the selected group", () => {
  it("all groups shows everything, including unassigned depots", async () => {
    expect(await fleetRepo.listDepots()).toHaveLength(3);
    expect(await fleetRepo.listTrucks()).toHaveLength(3);
    expect(await fleetRepo.listDrivers()).toHaveLength(3);
  });

  it("selecting 301 shows only its depots, trucks and drivers", async () => {
    expect((await fleetRepo.listDepots("301")).map((d) => d.name)).toEqual(["Greenacre"]);
    expect((await fleetRepo.listTrucks("301")).map((t) => t.id).sort()).toEqual(["NSW1", "NSW2"]);
    expect((await fleetRepo.listDrivers("301")).map((d) => d.name)).toEqual(["NSW Driver"]);
  });

  it("selecting 401 shows only Victoria", async () => {
    expect((await fleetRepo.listTrucks("401")).map((t) => t.id)).toEqual(["VIC1"]);
    expect((await fleetRepo.listDrivers("401")).map((d) => d.name)).toEqual(["VIC Driver"]);
  });

  it("a depot with no group is only visible in the all-groups view", async () => {
    expect((await fleetRepo.listDepots("301")).map((d) => d.name)).not.toContain("Unassigned Yard");
    expect((await fleetRepo.listDepots()).map((d) => d.name)).toContain("Unassigned Yard");
  });

  it("admin lists narrow too", async () => {
    expect(await fleetRepo.listAllTrucks("401")).toHaveLength(1);
    expect(await fleetRepo.listAllDrivers("401")).toHaveLength(1);
    expect(await fleetRepo.listAllDepots("401")).toHaveLength(1);
  });
});

describe("the board narrows to the selected group", () => {
  it("roll-forward only synthesises that group's trucks", async () => {
    expect((await fleetBoardRepo.getBoard(DAY, "301")).map((r) => r.truck).sort()).toEqual(["NSW1", "NSW2"]);
    expect((await fleetBoardRepo.getBoard(DAY, "401")).map((r) => r.truck)).toEqual(["VIC1"]);
    expect(await fleetBoardRepo.getBoard(DAY)).toHaveLength(3);
  });

  it("a saved day is filtered the same way", async () => {
    await fleetBoardRepo.materialise(DAY, null); // saves all three trucks
    expect((await fleetBoardRepo.getBoard(DAY, "401")).map((r) => r.truck)).toEqual(["VIC1"]);
    expect(await fleetBoardRepo.getBoard(DAY)).toHaveLength(3);
  });

  it("editing still writes the whole day — the filter is a view, not a scope", async () => {
    await fleetBoardRepo.applyChanges(DAY, [{ truckId: "VIC1", status: "OFF-BD" }], null);
    expect(await prisma.truckAssignment.count({ where: { date: DAY } })).toBe(3);
  });
});

describe("the catalog hides regions with nothing in them", () => {
  it("only offers regions that have depots in the selected group", async () => {
    expect((await loadFleetCatalog("301")).regions).toEqual(["Metro"]);
    expect((await loadFleetCatalog("401")).regions).toEqual(["South"]);
    expect((await loadFleetCatalog()).regions.sort()).toEqual(["Metro", "South"]);
  });
});
