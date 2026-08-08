import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { applyMigrations, seedFixture, wipeData, type Fixture } from "@/test/db";
import { complianceRepo } from "./compliance.repo";

/**
 * Competencies: tick-box credentials, and the truck-type gate they drive
 * ("can this driver drive this kind of truck?").
 */
let fx: Fixture;

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  fx = await seedFixture();
  await prisma.credentialType.createMany({
    data: [
      { code: "AGI", name: "Agitator sign-off", kind: "TICKBOX", category: "Truck types", requiredForTruckType: "Agitator", sortOrder: 1 },
      { code: "MXHS", name: "High-strength mixes", kind: "TICKBOX", category: "Mix training", sortOrder: 2 },
      { code: "HV", name: "Heavy vehicle licence", kind: "EXPIRY", category: "Tickets & medicals", severity: "BLOCK", warnDays: 30, sortOrder: 3 },
    ],
  });
});

describe("tick-box competencies", () => {
  it("granting is idempotent, and revoking removes it", async () => {
    await complianceRepo.setTickbox(fx.driver1, "MXHS", true);
    await complianceRepo.setTickbox(fx.driver1, "MXHS", true);
    expect(await prisma.driverCredential.count({ where: { driverId: fx.driver1, typeCode: "MXHS" } })).toBe(1);

    await complianceRepo.setTickbox(fx.driver1, "MXHS", false);
    expect(await prisma.driverCredential.count({ where: { driverId: fx.driver1, typeCode: "MXHS" } })).toBe(0);
  });

  it("revoking something never granted is harmless", async () => {
    await expect(complianceRepo.setTickbox(fx.driver1, "MXHS", false)).resolves.not.toThrow();
  });

  it("a competency carries no expiry, so it never reads as expiring", async () => {
    await complianceRepo.setTickbox(fx.driver1, "AGI", true);
    const row = await prisma.driverCredential.findFirstOrThrow({ where: { driverId: fx.driver1, typeCode: "AGI" } });
    expect(row.expiresOn).toBeNull();
  });
});

describe("missingForTruckType — the 'can they drive it?' gate", () => {
  it("blocks a driver who isn't signed off for that truck type", async () => {
    const missing = await complianceRepo.missingForTruckType(fx.driver1, "Agitator");
    expect(missing.map((m) => m.code)).toEqual(["AGI"]);
  });

  it("passes once they're signed off", async () => {
    await complianceRepo.setTickbox(fx.driver1, "AGI", true);
    expect(await complianceRepo.missingForTruckType(fx.driver1, "Agitator")).toEqual([]);
  });

  it("only gates the truck type it names", async () => {
    expect(await complianceRepo.missingForTruckType(fx.driver1, "Tipper")).toEqual([]);
  });

  it("optional competencies never gate anything", async () => {
    await complianceRepo.setTickbox(fx.driver1, "AGI", true);
    // driver1 has no MXHS, but it isn't required for any truck type.
    expect(await complianceRepo.missingForTruckType(fx.driver1, "Agitator")).toEqual([]);
  });

  it("hiding the type in Setup lifts the gate", async () => {
    await complianceRepo.setTypeActive("AGI", false);
    expect(await complianceRepo.missingForTruckType(fx.driver1, "Agitator")).toEqual([]);
  });
});

describe("profileFor — what the driver's profile shows", () => {
  it("lists every active type, grouped by category, flagged held or not", async () => {
    await complianceRepo.setTickbox(fx.driver1, "MXHS", true);
    const rows = await complianceRepo.profileFor(fx.driver1);

    expect(rows).toHaveLength(3);
    const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(byCode.MXHS).toMatchObject({ held: true, kind: "TICKBOX", category: "Mix training" });
    expect(byCode.AGI).toMatchObject({ held: false, requiredForTruckType: "Agitator" });
    expect(byCode.HV).toMatchObject({ held: false, kind: "EXPIRY" });
  });

  it("carries the expiry and reference of a dated ticket", async () => {
    await complianceRepo.upsertCredential({
      driverId: fx.driver1,
      typeCode: "HV",
      reference: "HC-1234",
      expiresOn: new Date("2027-01-01T00:00:00.000Z"),
      notes: null,
    });
    const row = (await complianceRepo.profileFor(fx.driver1)).find((r) => r.code === "HV");
    expect(row).toMatchObject({ held: true, reference: "HC-1234" });
    expect(row?.expiresOn?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("omits hidden types", async () => {
    await complianceRepo.setTypeActive("MXHS", false);
    expect((await complianceRepo.profileFor(fx.driver1)).map((r) => r.code)).not.toContain("MXHS");
  });
});
