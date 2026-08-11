import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { applyMigrations, wipeData } from "@/test/db";
import { fleetBoardRepo } from "./fleet-board.repo";
import { dateFromKey } from "@/lib/wfm/date";

/**
 * Board status rules: turning a truck off releases its driver; a breakdown
 * stays planned off until it's planned back on; timed statuses carry a
 * planned time that clears with the status.
 */
const MON = dateFromKey("2026-08-03");
const TUE = dateFromKey("2026-08-04");
const WED = dateFromKey("2026-08-05");
const THU = dateFromKey("2026-08-06");

let d1: number;
let d2: number;

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  await prisma.fleetRegion.create({ data: { name: "Metro" } });
  const depot = await prisma.depot.create({ data: { name: "Greenacre", regionName: "Metro" } });
  d1 = (await prisma.driver.create({ data: { name: "Driver One", employeeNo: "1", depotId: depot.id } })).id;
  d2 = (await prisma.driver.create({ data: { name: "Driver Two", employeeNo: "2", depotId: depot.id } })).id;
  await prisma.truck.create({ data: { id: "T1", depotId: depot.id, region: "Metro", block: "B", defaultDriverId: d1 } });
  await prisma.truck.create({ data: { id: "T2", depotId: depot.id, region: "Metro", block: "B", defaultDriverId: d2 } });
});

const rowFor = async (date: Date, truck: string) =>
  (await fleetBoardRepo.getBoard(date)).find((r) => r.truck === truck)!;

describe("turning a truck off", () => {
  it("releases the driver on any OFF status", async () => {
    const res = await fleetBoardRepo.setStatus(MON, "T1", "OFF-PAR", null);
    expect(res.clearedDriver).toBe(d1);
    const row = await rowFor(MON, "T1");
    expect(row.status).toBe("OFF-PAR");
    expect(row.driverId).toBeNull();
  });

  it("keeps the driver on an ON status", async () => {
    const res = await fleetBoardRepo.setStatus(MON, "T1", "ON-LS", null);
    expect(res.clearedDriver).toBeNull();
    expect((await rowFor(MON, "T1")).driverId).toBe(d1);
  });
});

describe("a breakdown plans forward", () => {
  it("unsaved later days synthesise the truck as still broken down, driver in spares", async () => {
    await fleetBoardRepo.setStatus(MON, "T1", "OFF-BD", null);
    const wed = await rowFor(WED, "T1");
    expect(wed.status).toBe("OFF-BD");
    expect(wed.driverId).toBeNull();
    // the other truck rolls forward normally
    expect((await rowFor(WED, "T2")).status).toBe("ON");
  });

  it("already-saved later days get planned off too", async () => {
    await fleetBoardRepo.materialise(TUE, null); // Tuesday saved with T1 ON
    await fleetBoardRepo.setStatus(MON, "T1", "OFF-BD", null);
    const tue = await rowFor(TUE, "T1");
    expect(tue.status).toBe("OFF-BD");
    expect(tue.driverId).toBeNull();
  });

  it("planning it back on stops the carry-forward and restores the default driver", async () => {
    await fleetBoardRepo.setStatus(MON, "T1", "OFF-BD", null);
    await fleetBoardRepo.setStatus(WED, "T1", "ON", null); // back on Wednesday
    expect((await rowFor(WED, "T1")).status).toBe("ON");
    // Thursday synthesises from the latest saved state — Wednesday's ON.
    const thu = await rowFor(THU, "T1");
    expect(thu.status).toBe("ON");
    expect(thu.driverId).toBe(d1);
    // Tuesday (between breakdown and back-on) stays broken.
    expect((await rowFor(TUE, "T1")).status).toBe("OFF-BD");
  });

  it("releasing later saved days gives the default driver back only when free", async () => {
    await fleetBoardRepo.materialise(WED, null);
    await fleetBoardRepo.setStatus(MON, "T1", "OFF-BD", null); // Wednesday saved → OFF-BD
    // Wednesday: D1 covers T2 instead.
    await fleetBoardRepo.moveDriver(WED, d1, "T2", null);
    await fleetBoardRepo.setStatus(MON, "T1", "ON", null); // back on from Monday
    const wed = await rowFor(WED, "T1");
    expect(wed.status).toBe("OFF-ND"); // needs cover — its driver is busy on T2
    expect(wed.driverId).toBeNull();
    expect((await rowFor(WED, "T2")).driverId).toBe(d1);
  });
});

describe("timed statuses", () => {
  it("keeps the planned time while the status is timed, clears it when not", async () => {
    await fleetBoardRepo.setStatus(MON, "T1", "ON-LS", null);
    await fleetBoardRepo.applyChanges(MON, [{ truckId: "T1", statusTime: "09:30" }], null);
    expect((await rowFor(MON, "T1")).statusTime).toBe("09:30");

    await fleetBoardRepo.setStatus(MON, "T1", "ON-SER", null); // still timed — time survives
    expect((await rowFor(MON, "T1")).statusTime).toBe("09:30");

    await fleetBoardRepo.setStatus(MON, "T1", "ON", null); // not timed — time clears
    expect((await rowFor(MON, "T1")).statusTime).toBeNull();
  });
});
