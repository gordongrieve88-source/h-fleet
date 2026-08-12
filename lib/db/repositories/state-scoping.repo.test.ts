import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { applyMigrations, wipeData } from "@/test/db";
import { complianceRepo } from "./compliance.repo";

/**
 * State scoping end to end: a credential only reaches drivers whose depot is
 * in a state it covers — on the profile, in the doctor, and at the gate.
 */
let nswDriver: number;
let vicDriver: number;

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  await prisma.leaveType.create({ data: { code: "AL", name: "Annual leave" } });
  await prisma.fleetRegion.create({ data: { name: "Metro" } });
  const nsw = await prisma.depot.create({ data: { name: "Greenacre", regionName: "Metro", state: "NSW" } });
  const vic = await prisma.depot.create({ data: { name: "Laverton", regionName: "Metro", state: "VIC" } });
  nswDriver = (await prisma.driver.create({ data: { name: "NSW Driver", employeeNo: "N1", depotId: nsw.id } })).id;
  vicDriver = (await prisma.driver.create({ data: { name: "VIC Driver", employeeNo: "V1", depotId: vic.id } })).id;
  await prisma.truck.create({ data: { id: "T-NSW", depotId: nsw.id, region: "Metro", block: "B", type: "Agitator" } });
  await prisma.truck.create({ data: { id: "T-VIC", depotId: vic.id, region: "Metro", block: "B", type: "Agitator" } });

  await prisma.credentialType.createMany({
    data: [
      { code: "NAT", name: "National medical", kind: "EXPIRY", category: "Tickets", states: "ALL", severity: "BLOCK", warnDays: 30 },
      { code: "NSWIND", name: "NSW site induction", kind: "TICKBOX", category: "Site inductions", states: "NSW" },
      { code: "VICAGI", name: "VIC agitator sign-off", kind: "TICKBOX", category: "Truck types", states: "VIC", requiredForTruckType: "Agitator" },
    ],
  });
});

describe("the driver profile only offers what applies where they are", () => {
  it("a NSW driver sees national + NSW credentials, not VIC ones", async () => {
    const codes = (await complianceRepo.profileFor(nswDriver)).map((r) => r.code).sort();
    expect(codes).toEqual(["NAT", "NSWIND"]);
  });

  it("a VIC driver sees national + VIC credentials, not NSW ones", async () => {
    const codes = (await complianceRepo.profileFor(vicDriver)).map((r) => r.code).sort();
    expect(codes).toEqual(["NAT", "VICAGI"]);
  });

  it("widening a credential to both states reaches both drivers", async () => {
    await complianceRepo.updateType("NSWIND", {
      name: "Site induction",
      kind: "TICKBOX",
      category: "Site inductions",
      states: "NSW,VIC",
      severity: "WARN",
      warnDays: 0,
      requiredForTruckType: null,
      sortOrder: 0,
    });
    expect((await complianceRepo.profileFor(vicDriver)).map((r) => r.code)).toContain("NSWIND");
  });
});

describe("the truck-type gate respects state", () => {
  it("a VIC-only sign-off gates the VIC driver", async () => {
    expect((await complianceRepo.missingForTruckType(vicDriver, "Agitator")).map((m) => m.code)).toEqual(["VICAGI"]);
  });

  it("...and never gates the NSW driver, who can't even hold it", async () => {
    expect(await complianceRepo.missingForTruckType(nswDriver, "Agitator")).toEqual([]);
  });

  it("signing the VIC driver off lifts their gate", async () => {
    await complianceRepo.setTickbox(vicDriver, "VICAGI", true);
    expect(await complianceRepo.missingForTruckType(vicDriver, "Agitator")).toEqual([]);
  });

  it("moving a depot interstate re-scopes its drivers", async () => {
    await prisma.depot.update({ where: { name: "Greenacre" }, data: { state: "VIC" } });
    expect((await complianceRepo.missingForTruckType(nswDriver, "Agitator")).map((m) => m.code)).toEqual(["VICAGI"]);
    expect((await complianceRepo.profileFor(nswDriver)).map((r) => r.code).sort()).toEqual(["NAT", "VICAGI"]);
  });
});

describe("expiry blocking respects state", () => {
  const past = new Date("2020-01-01T00:00:00.000Z");
  const today = new Date("2026-08-08T00:00:00.000Z");

  it("a national blocking ticket blocks in every state", async () => {
    await complianceRepo.upsertCredential({ driverId: vicDriver, typeCode: "NAT", reference: null, expiresOn: past, notes: null });
    expect(await complianceRepo.expiredBlocking(vicDriver, today)).toHaveLength(1);
  });

  it("a credential scoped elsewhere can't block, even if somehow held", async () => {
    await complianceRepo.updateType("NSWIND", {
      name: "NSW site induction",
      kind: "EXPIRY",
      category: "Site inductions",
      states: "NSW",
      severity: "BLOCK",
      warnDays: 30,
      requiredForTruckType: null,
      sortOrder: 0,
    });
    await complianceRepo.upsertCredential({ driverId: vicDriver, typeCode: "NSWIND", reference: null, expiresOn: past, notes: null });
    expect(await complianceRepo.expiredBlocking(vicDriver, today)).toEqual([]);
  });
});
