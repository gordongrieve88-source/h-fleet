import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { dateFromKey, addDaysUTC, ymd } from "@/lib/wfm/date";
import { runLengthEndingAt } from "@/lib/wfm/compliance";
import { applyMigrations, seedFixture, wipeData, type Fixture } from "@/test/db";
import { complianceRepo } from "./compliance.repo";
import { fleetBoardRepo } from "./fleet-board.repo";
import { driverLeaveRepo } from "./driver-leave.repo";

const TODAY = dateFromKey("2026-08-10");
let fx: Fixture;

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  fx = await seedFixture();
  await prisma.credentialType.createMany({
    data: [
      { code: "HV", name: "Heavy vehicle licence", severity: "BLOCK", warnDays: 60 },
      { code: "MED", name: "Medical", severity: "WARN", warnDays: 60 },
    ],
  });
});

describe("credentials", () => {
  it("upsert renews in place — one row per driver/type", async () => {
    await complianceRepo.upsertCredential({ driverId: fx.driver1, typeCode: "HV", reference: "A", expiresOn: TODAY, notes: null });
    await complianceRepo.upsertCredential({ driverId: fx.driver1, typeCode: "HV", reference: "B", expiresOn: addDaysUTC(TODAY, 365), notes: null });
    const all = await prisma.driverCredential.findMany({ where: { driverId: fx.driver1 } });
    expect(all).toHaveLength(1);
    expect(all[0].reference).toBe("B");
  });

  it("expiredBlocking gates only on expired BLOCK-severity credentials", async () => {
    await complianceRepo.upsertCredential({ driverId: fx.driver1, typeCode: "HV", reference: null, expiresOn: addDaysUTC(TODAY, -1), notes: null });
    await complianceRepo.upsertCredential({ driverId: fx.driver2, typeCode: "MED", reference: null, expiresOn: addDaysUTC(TODAY, -50), notes: null });
    await complianceRepo.upsertCredential({ driverId: fx.driver3, typeCode: "HV", reference: null, expiresOn: TODAY, notes: null });

    expect(await complianceRepo.expiredBlocking(fx.driver1, TODAY)).toHaveLength(1); // BLOCK + expired
    expect(await complianceRepo.expiredBlocking(fx.driver2, TODAY)).toHaveLength(0); // WARN only
    expect(await complianceRepo.expiredBlocking(fx.driver3, TODAY)).toHaveLength(0); // expires today = still valid
  });

  it("a hidden credential type stops blocking", async () => {
    await complianceRepo.upsertCredential({ driverId: fx.driver1, typeCode: "HV", reference: null, expiresOn: addDaysUTC(TODAY, -1), notes: null });
    await complianceRepo.setTypeActive("HV", false);
    expect(await complianceRepo.expiredBlocking(fx.driver1, TODAY)).toHaveLength(0);
  });
});

describe("workedDaySets — fatigue-run input", () => {
  it("merges captured days (on-road only) with roll-forward defaults minus leave", async () => {
    const d3 = addDaysUTC(TODAY, -3); // uncaptured
    const d2 = addDaysUTC(TODAY, -2); // uncaptured
    const d1 = addDaysUTC(TODAY, -1); // captured below

    // driver2 on approved leave three days ago.
    await driverLeaveRepo.add({ driverId: fx.driver2, leaveTypeCode: "AL", start: d3, end: d3, createdByUserId: null });
    // Capture yesterday, then break down T1 (driver1 assigned but NOT working).
    await fleetBoardRepo.applyChanges(d1, [{ truckId: "T1", status: "OFF-BD" }], null);

    const sets = await complianceRepo.workedDaySets(d3, TODAY);

    // driver1: defaults on d3, d2, TODAY; captured d1 is OFF-BD -> gap.
    expect(sets.get(fx.driver1)).toEqual(new Set([ymd(d3), ymd(d2), ymd(TODAY)]));
    expect(runLengthEndingAt(sets.get(fx.driver1)!, ymd(TODAY))).toBe(1);

    // driver2: leave on d3, then works d2 (default), d1 (captured ON), TODAY.
    expect(sets.get(fx.driver2)).toEqual(new Set([ymd(d2), ymd(d1), ymd(TODAY)]));
    expect(runLengthEndingAt(sets.get(fx.driver2)!, ymd(TODAY))).toBe(3);

    // driver3 has no default truck and no saved shifts.
    expect(sets.get(fx.driver3)).toBeUndefined();
  });

  it("roll-forward days skip Sundays — an uncaptured Sunday is a day off", async () => {
    const sunday = dateFromKey("2026-08-09");
    const sets = await complianceRepo.workedDaySets(sunday, sunday);
    expect(sets.size).toBe(0);
  });
});
