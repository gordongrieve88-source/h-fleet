import { describe, expect, it } from "vitest";
import { detectSheetDate, parseAllocationLines } from "./syncrotess";

const ctx = {
  truckIds: ["T1", "T2", "T3"],
  drivers: [
    { id: 1, name: "Alpha Driver", empNo: "101" },
    { id: 2, name: "Bravo Driver", empNo: "102" },
    { id: 3, name: "Charlie (Chuck) Driver", empNo: "103" },
  ],
};

describe("parseAllocationLines — entity matching, not layout trust", () => {
  it("matches truck + full name + time on one line", () => {
    const { entries } = parseAllocationLines(["T1\tAlpha Driver\t05:30"], ctx);
    expect(entries).toEqual([
      expect.objectContaining({ truckId: "T1", driverId: 1, time: "05:30", status: "ok" }),
    ]);
  });

  it("employee number beats name matching, and pm times convert to 24h", () => {
    const { entries } = parseAllocationLines(["T2   102   6:15 pm"], ctx);
    expect(entries[0]).toMatchObject({ truckId: "T2", driverId: 2, time: "18:15", status: "ok" });
  });

  it('handles "Last, First" and parenthesised nicknames', () => {
    const { entries } = parseAllocationLines(["T3  Driver, Charlie  7:05"], ctx);
    expect(entries[0]).toMatchObject({ truckId: "T3", driverId: 3, time: "07:05", status: "ok" });
  });

  it("lower-cases truck codes still match; unknown codes are flagged, not guessed", () => {
    const { entries } = parseAllocationLines(["t1 Alpha Driver 05:00", "AB123 Someone 05:00"], ctx);
    expect(entries[0]).toMatchObject({ truckId: "T1", status: "ok" });
    expect(entries[1]).toMatchObject({ truckId: null, truckToken: "AB123", status: "unknown-truck" });
  });

  it("flags missing pieces instead of dropping the row", () => {
    const { entries } = parseAllocationLines(["T1  05:30", "T2 Bravo Driver"], ctx);
    expect(entries[0]).toMatchObject({ truckId: "T1", driverId: null, status: "no-driver" });
    expect(entries[1]).toMatchObject({ truckId: "T2", driverId: 2, time: null, status: "no-time" });
  });

  it("flags a truck listed twice and a driver on two trucks", () => {
    const { entries } = parseAllocationLines(
      ["T1 Alpha Driver 05:00", "T1 Bravo Driver 06:00", "T2 Alpha Driver 07:00"], ctx,
    );
    expect(entries[0].status).toBe("ok");
    expect(entries[1].status).toBe("duplicate");
    expect(entries[2].status).toBe("duplicate");
  });

  it("ignores headers and noise lines", () => {
    const { entries } = parseAllocationLines(["DAILY TRUCK ALLOCATIONS", "Truck  Driver  Start", ""], ctx);
    expect(entries).toHaveLength(0);
  });
});

describe("detectSheetDate", () => {
  it("reads AU slashes, ISO, and worded dates", () => {
    expect(detectSheetDate(["Allocations for 08/08/2026"])).toBe("2026-08-08");
    expect(detectSheetDate(["run 2026-12-01 export"])).toBe("2026-12-01");
    expect(detectSheetDate(["Monday 9 August 2026"])).toBe("2026-08-09");
    expect(detectSheetDate(["no date here"])).toBeNull();
  });
});
