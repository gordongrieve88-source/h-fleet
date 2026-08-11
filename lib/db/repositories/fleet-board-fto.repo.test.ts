import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { applyMigrations, wipeData } from "@/test/db";
import { fleetBoardRepo } from "./fleet-board.repo";
import { ftoRotate, nextFto } from "@/lib/wfm/fleet";
import { dateFromKey } from "@/lib/wfm/date";

/**
 * First truck out — a first-in-first-out cyclical roster per plant:
 * alphanumeric order, one step forward per day, off trucks miss their turn,
 * and the board rotates the plant's list to start at the day's FTO.
 */
const MON = dateFromKey("2026-08-03");
const TUE = dateFromKey("2026-08-04");
const WED = dateFromKey("2026-08-05");
const FRI = dateFromKey("2026-08-07");

beforeAll(() => applyMigrations());
beforeEach(async () => {
  await wipeData();
  await prisma.fleetRegion.create({ data: { name: "Metro" } });
  const depot = await prisma.depot.create({ data: { name: "Greenacre", regionName: "Metro" } });
  // One plant with three trucks (unsorted insert order), another with one.
  for (const [i, id] of ["T3333", "T1111", "T2222"].entries()) {
    const d = await prisma.driver.create({ data: { name: `Driver ${id}`, employeeNo: `${i + 1}`, depotId: depot.id } });
    await prisma.truck.create({ data: { id, depotId: depot.id, region: "Metro", block: "Greenacre", defaultDriverId: d.id } });
  }
  await prisma.truck.create({ data: { id: "T9999", depotId: depot.id, region: "Metro", block: "Pyrmont" } });
});

const ftoOf = async (date: Date, block = "Greenacre") => {
  const rows = await fleetBoardRepo.getBoard(date);
  return rows.find((r) => r.fto && r.truck.startsWith(block === "Greenacre" ? "T" : "X") && ["T1111", "T2222", "T3333"].includes(r.truck))
    ?.truck;
};

describe("the cycle", () => {
  it("starts at the first truck alphanumerically and each plant has its own FTO", async () => {
    const rows = await fleetBoardRepo.getBoard(MON);
    expect(rows.find((r) => r.truck === "T1111")?.fto).toBe(true);
    expect(rows.find((r) => r.truck === "T9999")?.fto).toBe(true); // its own plant
    expect(rows.filter((r) => r.fto)).toHaveLength(2);
  });

  it("advances one truck per day once a day is saved", async () => {
    await fleetBoardRepo.materialise(MON, null); // Monday saved: T1111 leads
    expect(await ftoOf(TUE)).toBe("T2222");
  });

  it("advances one position per calendar day across unsaved gaps", async () => {
    await fleetBoardRepo.materialise(MON, null); // T1111 leads Monday
    // Friday is 4 days on: 1111 → 2222 → 3333 → 1111 → 2222.
    expect(await ftoOf(FRI)).toBe("T2222");
  });

  it("an off truck misses its turn", async () => {
    await fleetBoardRepo.materialise(MON, null);
    await fleetBoardRepo.setStatus(MON, "T2222", "OFF-BD", null); // broken from Monday
    // Tuesday would be T2222's turn — it's still broken, so T3333 steps up.
    expect(await ftoOf(TUE)).toBe("T3333");
  });
});

describe("the marker follows status changes on the day", () => {
  it("moves to the next on-road truck when the FTO truck goes off", async () => {
    await fleetBoardRepo.materialise(MON, null); // T1111 leads
    await fleetBoardRepo.setStatus(MON, "T1111", "OFF-PAR", null);
    const rows = await fleetBoardRepo.getBoard(MON);
    expect(rows.find((r) => r.truck === "T1111")?.fto).toBe(false);
    expect(rows.find((r) => r.truck === "T2222")?.fto).toBe(true);
  });

  it("clears when the whole plant is off, and re-seats when a truck comes back", async () => {
    await fleetBoardRepo.materialise(MON, null);
    for (const id of ["T1111", "T2222", "T3333"]) await fleetBoardRepo.setStatus(MON, id, "OFF-PAR", null);
    let rows = await fleetBoardRepo.getBoard(MON);
    expect(rows.filter((r) => r.fto && r.truck !== "T9999")).toHaveLength(0);
    await fleetBoardRepo.setStatus(MON, "T3333", "ON", null);
    rows = await fleetBoardRepo.getBoard(MON);
    expect(rows.find((r) => r.truck === "T3333")?.fto).toBe(true);
  });

  it("a breakdown clears the marker on later saved days too", async () => {
    await fleetBoardRepo.materialise(TUE, null); // Tuesday saved: T2222 leads? — no anchor, T1111 leads
    await fleetBoardRepo.setStatus(MON, "T1111", "OFF-BD", null); // breaks Mon → Tue planned off
    const tue = await fleetBoardRepo.getBoard(TUE);
    expect(tue.find((r) => r.truck === "T1111")?.status).toBe("OFF-BD");
    expect(tue.find((r) => r.truck === "T1111")?.fto).toBe(false);
    expect(tue.filter((r) => r.fto && r.truck !== "T9999")).toHaveLength(1);
  });
});

describe("manual override", () => {
  it("hands FTO to the chosen truck and anchors tomorrow's cycle from it", async () => {
    await fleetBoardRepo.materialise(MON, null); // T1111 leads by default
    await fleetBoardRepo.setFto(MON, "T3333", null);
    const mon = await fleetBoardRepo.getBoard(MON);
    expect(mon.find((r) => r.truck === "T3333")?.fto).toBe(true);
    expect(mon.find((r) => r.truck === "T1111")?.fto).toBe(false);
    // Tuesday advances from the override: after T3333 comes T1111.
    expect(await ftoOf(TUE)).toBe("T1111");
  });

  it("refuses an off-road truck", async () => {
    await fleetBoardRepo.setStatus(MON, "T2222", "OFF-PAR", null);
    await expect(fleetBoardRepo.setFto(MON, "T2222", null)).rejects.toThrow(/must be on road/);
  });
});

describe("the pure helpers", () => {
  it("nextFto wraps the cycle and skips off trucks", () => {
    const trucks = ["A1", "A2", "A3"];
    expect(nextFto(trucks, "A3", 1, () => true)).toBe("A1");
    expect(nextFto(trucks, "A1", 2, () => true)).toBe("A3");
    expect(nextFto(trucks, "A1", 1, (t) => t !== "A2")).toBe("A3");
    expect(nextFto(trucks, null, 1, () => true)).toBe("A1");
    expect(nextFto(trucks, "A1", 1, () => false)).toBeNull();
    expect(nextFto([], null, 1, () => true)).toBeNull();
  });

  it("ftoRotate sorts alphanumerically and starts at the FTO", () => {
    const rows = [
      { truck: "T10", fto: false },
      { truck: "T2", fto: true },
      { truck: "T1", fto: false },
    ];
    expect(ftoRotate(rows).map((r) => r.truck)).toEqual(["T2", "T10", "T1"]);
    // no FTO row: plain alphanumeric (numeric-aware: T2 before T10)
    expect(ftoRotate(rows.map((r) => ({ ...r, fto: false }))).map((r) => r.truck)).toEqual(["T1", "T2", "T10"]);
  });
});
