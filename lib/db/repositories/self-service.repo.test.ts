import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { dateFromKey, addDaysUTC, ymd } from "@/lib/wfm/date";
import { applyMigrations, seedFixture, wipeData, type Fixture } from "@/test/db";
import { selfServiceRepo } from "./self-service.repo";
import { fleetBoardRepo } from "./fleet-board.repo";
import { driverLeaveRepo } from "./driver-leave.repo";

// Wednesday; the fixture gives driver1 the default of truck T1.
const DAY = dateFromKey("2026-08-05");
let fx: Fixture;

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  fx = await seedFixture();
});

describe("account linking", () => {
  it("resolves the driver behind a sign-in, and unlinks cleanly", async () => {
    const user = await prisma.appUser.create({ data: { displayName: "A Driver", role: "STAFF" } });
    expect(await selfServiceRepo.driverForUser(user.id)).toBeNull();

    await selfServiceRepo.setDriverAccount(fx.driver1, user.id);
    expect((await selfServiceRepo.driverForUser(user.id))?.id).toBe(fx.driver1);

    await selfServiceRepo.setDriverAccount(fx.driver1, null);
    expect(await selfServiceRepo.driverForUser(user.id)).toBeNull();
  });

  it("refuses to link one account to two drivers", async () => {
    const user = await prisma.appUser.create({ data: { displayName: "A Driver", role: "STAFF" } });
    await selfServiceRepo.setDriverAccount(fx.driver1, user.id);
    await expect(selfServiceRepo.setDriverAccount(fx.driver2, user.id)).rejects.toThrow();
  });
});

describe("myDays — the driver's own view", () => {
  it("projects the default truck on uncaptured weekdays", async () => {
    const days = await selfServiceRepo.myDays(fx.driver1, DAY, DAY);
    expect(days[0]).toMatchObject({ dateKey: ymd(DAY), truck: "T1", status: "ON", captured: false });
  });

  it("shows the saved truck, start time and work location once a day is captured", async () => {
    await fleetBoardRepo.applyAllocations(
      DAY,
      [{ truckId: "T1", driverId: null, time: "05:30", workLocation: "OTHERVILLE CONCRETE" }],
      false,
      null,
    );
    const days = await selfServiceRepo.myDays(fx.driver1, DAY, DAY);
    expect(days[0]).toMatchObject({ truck: "T1", time: "05:30", workLocation: "OTHERVILLE CONCRETE", captured: true });
  });

  it("shows leave instead of a truck, and never projects onto a leave day", async () => {
    await driverLeaveRepo.add({ driverId: fx.driver1, leaveTypeCode: "AL", start: DAY, end: DAY, createdByUserId: null });
    const days = await selfServiceRepo.myDays(fx.driver1, DAY, DAY);
    expect(days[0]).toMatchObject({ truck: null, leaveCode: "AL" });
  });

  it("a captured day the driver isn't on reads as not rostered, not projected", async () => {
    await fleetBoardRepo.applyChanges(DAY, [{ truckId: "T1", driverId: null }], null);
    const days = await selfServiceRepo.myDays(fx.driver1, DAY, DAY);
    expect(days[0]).toMatchObject({ truck: null, captured: true });
  });

  it("never projects a Sunday", async () => {
    const sunday = dateFromKey("2026-08-09");
    const days = await selfServiceRepo.myDays(fx.driver1, sunday, sunday);
    expect(days[0].truck).toBeNull();
  });

  it("returns one entry per day across the whole range", async () => {
    const days = await selfServiceRepo.myDays(fx.driver1, DAY, addDaysUTC(DAY, 6));
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.dateKey)).toEqual([...Array(7)].map((_, i) => ymd(addDaysUTC(DAY, i))));
  });

  it("a driver with no default truck is simply not rostered", async () => {
    const days = await selfServiceRepo.myDays(fx.driver3, DAY, DAY);
    expect(days[0].truck).toBeNull();
  });
});
