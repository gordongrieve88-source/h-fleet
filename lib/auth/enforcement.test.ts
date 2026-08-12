import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { applyMigrations, seedFixture, wipeData } from "@/test/db";
import { getDepotScope, requireEditForDepot } from "./index";
import type { AppUser } from "@/generated/prisma/client";

/**
 * The scope guards against the real database: UserDepotScope rows, resolved
 * scope, and requireEditForDepot with an injected user (the same path every
 * server action takes after requireEdit()).
 */

let depotA: number;
let depotB: number;
let manager: AppUser;
let scopedSup: AppUser;
let freeSup: AppUser;
let staff: AppUser;

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  await seedFixture();
  depotA = (await prisma.depot.findUniqueOrThrow({ where: { name: "Testville" } })).id;
  depotB = (await prisma.depot.create({ data: { name: "Otherville", regionName: "Metro Test" } })).id;
  manager = await prisma.appUser.create({ data: { displayName: "M", role: "MANAGER" } });
  scopedSup = await prisma.appUser.create({ data: { displayName: "S-scoped", role: "SUPERVISOR" } });
  freeSup = await prisma.appUser.create({ data: { displayName: "S-free", role: "SUPERVISOR" } });
  staff = await prisma.appUser.create({ data: { displayName: "V", role: "STAFF" } });
  await prisma.userDepotScope.create({ data: { userId: scopedSup.id, depotId: depotA } });
});

describe("getDepotScope", () => {
  it("manager and unscoped supervisor are unrestricted", async () => {
    expect(await getDepotScope(manager)).toBeNull();
    expect(await getDepotScope(freeSup)).toBeNull();
  });

  it("a scoped supervisor gets their depots; staff and signed-out get none", async () => {
    expect(await getDepotScope(scopedSup)).toEqual([depotA]);
    expect(await getDepotScope(staff)).toEqual([]);
    expect(await getDepotScope(null)).toEqual([]);
  });
});

describe("requireEditForDepot", () => {
  it("allows manager and unscoped supervisor anywhere", async () => {
    await expect(requireEditForDepot(depotB, manager)).resolves.toBeTruthy();
    await expect(requireEditForDepot(depotB, freeSup)).resolves.toBeTruthy();
  });

  it("allows a scoped supervisor only inside their depots", async () => {
    await expect(requireEditForDepot(depotA, scopedSup)).resolves.toBeTruthy();
    await expect(requireEditForDepot(depotB, scopedSup)).rejects.toThrow("outside your access");
  });

  it("rejects a non-edit role even when injected directly", async () => {
    await expect(requireEditForDepot(depotA, staff)).rejects.toThrow("Supervisor or Manager");
  });
});
