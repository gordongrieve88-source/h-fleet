import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { applyMigrations, wipeData } from "@/test/db";
import { fleetBoardRepo } from "./fleet-board.repo";
import { dateFromKey } from "@/lib/wfm/date";

/**
 * Working from another depot for the day — transport's manual lend, stored
 * exactly like an imported allocation: on the day's row only.
 */
const MON = dateFromKey("2026-08-03");
const TUE = dateFromKey("2026-08-04");

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  await prisma.fleetRegion.create({ data: { name: "Metro" } });
  const depot = await prisma.depot.create({ data: { name: "Greenacre", regionName: "Metro" } });
  await prisma.truck.create({ data: { id: "T1111", depotId: depot.id, region: "Metro", block: "Greenacre" } });
  await prisma.truck.create({ data: { id: "T9999", depotId: depot.id, region: "Metro", block: "Pyrmont" } });
});

const locOf = async (date: Date) =>
  (await fleetBoardRepo.getBoard(date)).find((r) => r.truck === "T1111")?.workLocation ?? null;

describe("setWorkLocation", () => {
  it("lends the truck to another plant for the day only", async () => {
    await fleetBoardRepo.setWorkLocation(MON, "T1111", "Pyrmont", null);
    expect(await locOf(MON)).toBe("Pyrmont");
    // Tomorrow is untouched — the location is per-day data.
    expect(await locOf(TUE)).toBeNull();
  });

  it("null brings it home", async () => {
    await fleetBoardRepo.setWorkLocation(MON, "T1111", "Pyrmont", null);
    await fleetBoardRepo.setWorkLocation(MON, "T1111", null, null);
    expect(await locOf(MON)).toBeNull();
  });

  it("refuses a plant that doesn't exist", async () => {
    await expect(fleetBoardRepo.setWorkLocation(MON, "T1111", "Atlantis", null)).rejects.toThrow(/No plant called/);
  });
});
