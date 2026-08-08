import { describe, expect, it } from "vitest";
import { availabilityByDay, mean, plannedVsActual, truckReliability, type AssignmentFact } from "./analytics";
import { dateFromKey } from "./date";

const d1 = dateFromKey("2026-08-03");
const d2 = dateFromKey("2026-08-04");
const fact = (date: Date, truckId: string, status: string, driverId: number | null = 1): AssignmentFact => ({
  date,
  truckId,
  status,
  driverId,
});

describe("truckReliability", () => {
  it("ranks the most-broken-down truck first", () => {
    const rows = [
      fact(d1, "T1", "OFF-BD"),
      fact(d2, "T1", "OFF-BD"),
      fact(d1, "T2", "ON"),
      fact(d2, "T2", "OFF-BD"),
      fact(d1, "T3", "ON"),
      fact(d2, "T3", "ON"),
    ];
    const r = truckReliability(rows);
    expect(r.map((x) => x.truck)).toEqual(["T1", "T2", "T3"]);
    expect(r[0]).toMatchObject({ days: 2, breakdownDays: 2, breakdownRate: 1, availability: 0 });
    expect(r[1]).toMatchObject({ breakdownDays: 1, breakdownRate: 0.5, availability: 0.5 });
    expect(r[2]).toMatchObject({ breakdownDays: 0, breakdownRate: 0, availability: 1 });
  });

  it("counts service/dedag separately — those are still on road", () => {
    const r = truckReliability([fact(d1, "T1", "ON-SER"), fact(d2, "T1", "ON-DED")]);
    expect(r[0]).toMatchObject({ serviceDays: 2, breakdownDays: 0, onDays: 2, availability: 1 });
  });

  it("is case-insensitive about stored status codes", () => {
    expect(truckReliability([fact(d1, "T1", "off-bd")])[0].breakdownDays).toBe(1);
  });

  it("handles no data without dividing by zero", () => {
    expect(truckReliability([])).toEqual([]);
  });
});

describe("availabilityByDay", () => {
  it("computes per-day on-road share in date order", () => {
    const rows = [
      fact(d2, "T1", "ON"),
      fact(d2, "T2", "OFF-BD"),
      fact(d1, "T1", "ON"),
      fact(d1, "T2", "ON"),
    ];
    const a = availabilityByDay(rows);
    expect(a.map((x) => x.dateKey)).toEqual(["2026-08-03", "2026-08-04"]);
    expect(a[0]).toMatchObject({ on: 2, total: 2, pct: 1 });
    expect(a[1]).toMatchObject({ on: 1, total: 2, pct: 0.5 });
  });

  it("counts needs-cover the same way the board does", () => {
    const rows = [
      fact(d1, "T1", "ON", null), // on road, no driver -> cover
      fact(d1, "T2", "OFF-ND", null), // driver not in -> cover
      fact(d1, "T3", "OFF-BD", null), // broken down -> not a cover problem
      fact(d1, "T4", "ON", 7),
    ];
    expect(availabilityByDay(rows)[0].needsCover).toBe(2);
  });
});

describe("mean", () => {
  it("averages, and treats empty as zero", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([])).toBe(0);
  });
});

describe("plannedVsActual", () => {
  const defaults = new Map<string, number | null>([
    ["T1", 1],
    ["T2", 2],
    ["T3", null],
  ]);

  it("counts a truck carrying a different driver as changed", () => {
    const r = plannedVsActual([fact(d1, "T1", "ON", 1), fact(d1, "T2", "ON", 9)], defaults);
    expect(r.byDay[0]).toMatchObject({ changed: 1, total: 2, pct: 0.5 });
    expect(r.overallPct).toBe(0.5);
    expect(r.mostChanged[0]).toMatchObject({ truck: "T2", changed: 1, days: 1, pct: 1 });
  });

  it("an empty truck that had a default driver counts as changed", () => {
    const r = plannedVsActual([fact(d1, "T1", "OFF-ND", null)], defaults);
    expect(r.overallPct).toBe(1);
  });

  it("a truck with no default driver is unchanged when empty", () => {
    const r = plannedVsActual([fact(d1, "T3", "ON", null)], defaults);
    expect(r.overallPct).toBe(0);
    expect(r.mostChanged).toEqual([]);
  });

  it("ignores trucks that have left the fleet", () => {
    const r = plannedVsActual([fact(d1, "GONE", "ON", 5)], defaults);
    expect(r.byDay).toEqual([]);
    expect(r.overallPct).toBe(0);
  });

  it("ranks the most-reshuffled truck first across days", () => {
    const rows = [
      fact(d1, "T1", "ON", 99),
      fact(d2, "T1", "ON", 99), // changed both days
      fact(d1, "T2", "ON", 2),
      fact(d2, "T2", "ON", 99), // changed one of two
    ];
    const r = plannedVsActual(rows, defaults);
    expect(r.mostChanged.map((m) => m.truck)).toEqual(["T1", "T2"]);
    expect(r.mostChanged[0].pct).toBe(1);
    expect(r.mostChanged[1].pct).toBe(0.5);
  });
});
