import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { applyMigrations, seedFixture, wipeData, type Fixture } from "@/test/db";
import { complianceRepo } from "./compliance.repo";

/** Adding, retiring and removing credential types from Setup. */
let fx: Fixture;

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  fx = await seedFixture();
});

const base = {
  kind: "TICKBOX",
  category: "Mix training",
  severity: "WARN",
  warnDays: 0,
  requiredForTruckType: null,
  sortOrder: 10,
};

describe("adding a credential type", () => {
  it("appears immediately on every driver's profile", async () => {
    await complianceRepo.createType({ code: "MXPUMP", name: "Pump mixes", ...base });
    const codes = (await complianceRepo.profileFor(fx.driver1)).map((r) => r.code);
    expect(codes).toContain("MXPUMP");
  });

  it("a new group is just a new category label", async () => {
    await complianceRepo.createType({ code: "CONF", name: "Confined space", ...base, category: "Safety" });
    const row = (await complianceRepo.profileFor(fx.driver1)).find((r) => r.code === "CONF");
    expect(row?.category).toBe("Safety");
  });
});

describe("hiding vs removing", () => {
  beforeEach(async () => {
    await complianceRepo.createType({ code: "MXHS", name: "High-strength mixes", ...base });
    await complianceRepo.setTickbox(fx.driver1, "MXHS", true);
    await complianceRepo.setTickbox(fx.driver2, "MXHS", true);
  });

  it("hiding retires the type but keeps who held it", async () => {
    await complianceRepo.setTypeActive("MXHS", false);
    expect((await complianceRepo.profileFor(fx.driver1)).map((r) => r.code)).not.toContain("MXHS");
    expect(await prisma.driverCredential.count({ where: { typeCode: "MXHS" } })).toBe(2);
  });

  it("removing deletes the type and every driver record, and reports the count", async () => {
    const res = await complianceRepo.deleteType("MXHS");
    expect(res).toEqual({ name: "High-strength mixes", heldBy: 2 });
    expect(await prisma.credentialType.count({ where: { code: "MXHS" } })).toBe(0);
    expect(await prisma.driverCredential.count({ where: { typeCode: "MXHS" } })).toBe(0);
  });

  it("removing an unused type touches nothing else", async () => {
    await complianceRepo.createType({ code: "UNUSED", name: "Never granted", ...base });
    expect(await complianceRepo.deleteType("UNUSED")).toEqual({ name: "Never granted", heldBy: 0 });
    expect(await prisma.driverCredential.count({ where: { typeCode: "MXHS" } })).toBe(2); // untouched
  });

  it("removing one type leaves the others alone", async () => {
    await complianceRepo.createType({ code: "MXCOL", name: "Coloured", ...base });
    await complianceRepo.setTickbox(fx.driver1, "MXCOL", true);
    await complianceRepo.deleteType("MXHS");
    expect((await complianceRepo.profileFor(fx.driver1)).map((r) => r.code)).toEqual(["MXCOL"]);
    expect(await prisma.driverCredential.count({ where: { typeCode: "MXCOL" } })).toBe(1);
  });

  it("removing a gating competency lifts its truck-type gate", async () => {
    await complianceRepo.createType({ code: "AGI", name: "Agitator sign-off", ...base, category: "Truck types", requiredForTruckType: "Agitator" });
    expect(await complianceRepo.missingForTruckType(fx.driver3, "Agitator")).toHaveLength(1);
    await complianceRepo.deleteType("AGI");
    expect(await complianceRepo.missingForTruckType(fx.driver3, "Agitator")).toEqual([]);
  });

  it("removing something already gone is a clear error, not a crash", async () => {
    await expect(complianceRepo.deleteType("NOPE")).rejects.toThrow("no longer exists");
  });

  it("the holder count Setup warns with matches reality", async () => {
    const types = await complianceRepo.listAllTypes();
    expect(types.find((t) => t.code === "MXHS")?._count.credentials).toBe(2);
  });
});
