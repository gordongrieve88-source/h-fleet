import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { dateFromKey } from "@/lib/wfm/date";
import { applyMigrations, seedFixture, wipeData, type Fixture } from "@/test/db";
import { fleetBoardRepo } from "./fleet-board.repo";
import { driverLeaveRepo } from "./driver-leave.repo";

const DAY = dateFromKey("2026-08-05");
let fx: Fixture;

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  fx = await seedFixture();
});

async function savedRow(truckId: string) {
  return prisma.truckAssignment.findUnique({ where: { date_truckId: { date: DAY, truckId } } });
}

describe("roll-forward synthesis", () => {
  it("an unsaved day is synthesised from default drivers, nothing is written", async () => {
    const board = await fleetBoardRepo.getBoard(DAY);
    expect(board).toEqual([
      { truck: "T1", status: "ON", driverId: fx.driver1, time: "", workLocation: null, statusTime: null },
      { truck: "T2", status: "ON", driverId: fx.driver2, time: "", workLocation: null, statusTime: null },
      { truck: "T3", status: "ON", driverId: null, time: "", workLocation: null, statusTime: null },
    ]);
    expect(await fleetBoardRepo.isMaterialised(DAY)).toBe(false);
  });

  it("approved leave drops the default driver to needs-cover", async () => {
    await driverLeaveRepo.add({
      driverId: fx.driver2,
      leaveTypeCode: "AL",
      start: DAY,
      end: DAY,
      createdByUserId: null,
    });
    const board = await fleetBoardRepo.getBoard(DAY);
    expect(board.find((r) => r.truck === "T2")).toEqual({ truck: "T2", status: "OFF-ND", driverId: null, time: "", workLocation: null, statusTime: null });
  });
});

describe("materialise", () => {
  it("saves the synthesised day once, idempotently", async () => {
    await fleetBoardRepo.materialise(DAY, null);
    expect(await fleetBoardRepo.isMaterialised(DAY)).toBe(true);
    await fleetBoardRepo.materialise(DAY, null);
    expect(await prisma.truckAssignment.count({ where: { date: DAY } })).toBe(3);
  });

  it("survives concurrent first edits of the same day", async () => {
    await Promise.all([
      fleetBoardRepo.materialise(DAY, null),
      fleetBoardRepo.materialise(DAY, null),
      fleetBoardRepo.applyChanges(DAY, [{ truckId: "T1", status: "OFF-BD" }], null),
    ]);
    expect(await prisma.truckAssignment.count({ where: { date: DAY } })).toBe(3);
    expect((await savedRow("T1"))?.status).toBe("OFF-BD");
  });
});

describe("applyChanges", () => {
  it("materialises then applies, so a first edit saves the whole day", async () => {
    await fleetBoardRepo.applyChanges(DAY, [{ truckId: "T3", status: "OFF-PAR" }], null);
    expect(await prisma.truckAssignment.count({ where: { date: DAY } })).toBe(3);
    expect((await savedRow("T3"))?.status).toBe("OFF-PAR");
    expect((await savedRow("T1"))?.driverId).toBe(fx.driver1); // rest of the day captured as synthesised
  });
});

describe("moveDriver", () => {
  it("pool -> empty truck: assigns, reports no source and nobody displaced", async () => {
    const res = await fleetBoardRepo.moveDriver(DAY, fx.driver3, "T3", null);
    expect(res).toEqual({ from: null, displaced: null });
    expect((await savedRow("T3"))?.driverId).toBe(fx.driver3);
  });

  it("truck -> occupied truck: swaps, displaced driver goes back to the real source", async () => {
    const res = await fleetBoardRepo.moveDriver(DAY, fx.driver1, "T2", null);
    expect(res).toEqual({ from: "T1", displaced: fx.driver2 });
    expect((await savedRow("T2"))?.driverId).toBe(fx.driver1);
    expect((await savedRow("T1"))?.driverId).toBe(fx.driver2);
  });

  it("landing on a driver-not-in truck brings it back on road", async () => {
    await fleetBoardRepo.applyChanges(DAY, [{ truckId: "T3", status: "OFF-ND" }], null);
    await fleetBoardRepo.moveDriver(DAY, fx.driver3, "T3", null);
    const row = await savedRow("T3");
    expect(row?.driverId).toBe(fx.driver3);
    expect(row?.status).toBe("ON");
  });

  it("uses the SAVED day as the source of truth, not the caller's stale view", async () => {
    // Dispatcher A moves driver1 T1 -> T3. Dispatcher B, still looking at the
    // old board, then moves driver1 "from T1" onto T2. The move must release
    // T3 (where driver1 really is), not corrupt T1.
    await fleetBoardRepo.moveDriver(DAY, fx.driver1, "T3", null);
    const res = await fleetBoardRepo.moveDriver(DAY, fx.driver1, "T2", null);
    expect(res).toEqual({ from: "T3", displaced: fx.driver2 });
    expect((await savedRow("T2"))?.driverId).toBe(fx.driver1);
    expect((await savedRow("T3"))?.driverId).toBe(fx.driver2);
    const all = await prisma.truckAssignment.findMany({ where: { date: DAY, driverId: fx.driver1 } });
    expect(all.map((r) => r.truckId)).toEqual(["T2"]); // never on two trucks
  });

  it("heals a pre-existing double-assignment instead of spreading it", async () => {
    await fleetBoardRepo.applyChanges(
      DAY,
      [
        { truckId: "T2", driverId: fx.driver1 }, // driver1 now on T1 AND T2
      ],
      null,
    );
    await fleetBoardRepo.moveDriver(DAY, fx.driver1, "T3", null);
    const holding = await prisma.truckAssignment.findMany({ where: { date: DAY, driverId: fx.driver1 } });
    expect(holding.map((r) => r.truckId)).toEqual(["T3"]);
  });

  it("rejects a truck that doesn't exist on the board", async () => {
    await expect(fleetBoardRepo.moveDriver(DAY, fx.driver1, "NOPE", null)).rejects.toThrow("Unknown truck");
  });

  it("dropping a driver onto their own truck is a no-op swap", async () => {
    const res = await fleetBoardRepo.moveDriver(DAY, fx.driver1, "T1", null);
    expect(res).toEqual({ from: null, displaced: null });
    expect((await savedRow("T1"))?.driverId).toBe(fx.driver1);
  });
});

describe("applyAllocations — the Syncrotess import", () => {
  it("sets start times and places drivers, releasing them from other trucks", async () => {
    // Sheet: driver1 -> T2 at 06:00, driver3 -> T3 at 05:30.
    const res = await fleetBoardRepo.applyAllocations(
      DAY,
      [
        { truckId: "T2", driverId: fx.driver1, time: "06:00" },
        { truckId: "T3", driverId: fx.driver3, time: "05:30" },
      ],
      true,
      null,
    );
    expect(res).toEqual({ timesSet: 2, moves: 2, locations: 0 });
    expect(await savedRow("T2")).toMatchObject({ driverId: fx.driver1, time: "06:00" });
    expect(await savedRow("T3")).toMatchObject({ driverId: fx.driver3, time: "05:30" });
    // driver1 left T1; the sheet didn't re-place driver2, so T2's old driver is off.
    expect((await savedRow("T1"))?.driverId).toBeNull();
    const holdingD1 = await prisma.truckAssignment.findMany({ where: { date: DAY, driverId: fx.driver1 } });
    expect(holdingD1.map((r) => r.truckId)).toEqual(["T2"]);
  });

  it("applyDrivers=false touches only the times", async () => {
    const res = await fleetBoardRepo.applyAllocations(DAY, [{ truckId: "T2", driverId: fx.driver1, time: "06:45" }], false, null);
    expect(res).toEqual({ timesSet: 1, moves: 0, locations: 0 });
    expect(await savedRow("T2")).toMatchObject({ driverId: fx.driver2, time: "06:45" }); // original driver kept
  });

  it("placing a driver on a driver-not-in truck brings it back on road", async () => {
    await fleetBoardRepo.applyChanges(DAY, [{ truckId: "T3", status: "OFF-ND" }], null);
    await fleetBoardRepo.applyAllocations(DAY, [{ truckId: "T3", driverId: fx.driver3, time: "05:00" }], true, null);
    expect(await savedRow("T3")).toMatchObject({ driverId: fx.driver3, status: "ON", time: "05:00" });
  });

  it("re-importing the same sheet is a no-op", async () => {
    const allocs = [{ truckId: "T2", driverId: fx.driver1, time: "06:00", workLocation: "TESTVILLE CONCRETE" }];
    await fleetBoardRepo.applyAllocations(DAY, allocs, true, null);
    const second = await fleetBoardRepo.applyAllocations(DAY, allocs, true, null);
    expect(second).toEqual({ timesSet: 0, moves: 0, locations: 0 });
  });

  it("stores the day's work location (a truck lent to another plant)", async () => {
    const res = await fleetBoardRepo.applyAllocations(
      DAY,
      [{ truckId: "T1", driverId: null, time: "06:33", workLocation: "OTHERVILLE CONCRETE" }],
      false,
      null,
    );
    expect(res).toEqual({ timesSet: 1, moves: 0, locations: 1 });
    expect(await savedRow("T1")).toMatchObject({ time: "06:33", workLocation: "OTHERVILLE CONCRETE" });
    const board = await fleetBoardRepo.getBoard(DAY);
    expect(board.find((r) => r.truck === "T1")?.workLocation).toBe("OTHERVILLE CONCRETE");
  });
});

describe("day lifecycle", () => {
  it("dropDriverFromRange clears the driver and marks the truck driver-not-in", async () => {
    await fleetBoardRepo.materialise(DAY, null);
    const n = await fleetBoardRepo.dropDriverFromRange(fx.driver1, DAY, DAY);
    expect(n).toBe(1);
    const row = await savedRow("T1");
    expect(row?.driverId).toBeNull();
    expect(row?.status).toBe("OFF-ND");
  });

  it("resetDay discards edits and the board reverts to synthesis", async () => {
    await fleetBoardRepo.applyChanges(DAY, [{ truckId: "T1", status: "OFF-BD" }], null);
    await fleetBoardRepo.resetDay(DAY);
    expect(await fleetBoardRepo.isMaterialised(DAY)).toBe(false);
    const board = await fleetBoardRepo.getBoard(DAY);
    expect(board.find((r) => r.truck === "T1")?.status).toBe("ON");
  });

  it("listCapturedDates / assignmentsInRange only see saved days", async () => {
    const other = dateFromKey("2026-08-06");
    await fleetBoardRepo.materialise(DAY, null);
    const captured = await fleetBoardRepo.listCapturedDates(DAY, other);
    expect(captured.map((c) => c.date)).toEqual([DAY]);
    expect(await fleetBoardRepo.assignmentsInRange(DAY, other)).toHaveLength(3);
  });
});
