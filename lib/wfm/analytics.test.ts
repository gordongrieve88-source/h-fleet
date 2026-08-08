import { describe, expect, it } from "vitest";
import {
  availabilityByDay,
  mean,
  plannedVsActual,
  punctuality,
  startVarianceMinutes,
  truckReliability,
  type AssignmentFact,
} from "./analytics";
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

describe("startVarianceMinutes", () => {
  it("is positive when the truck left late, negative when early", () => {
    expect(startVarianceMinutes("06:00", "06:12")).toBe(12);
    expect(startVarianceMinutes("06:00", "05:52")).toBe(-8);
    expect(startVarianceMinutes("06:00", "06:00")).toBe(0);
  });

  it("crosses the hour correctly", () => {
    expect(startVarianceMinutes("05:55", "06:10")).toBe(15);
  });

  it("is null when either side is missing or malformed", () => {
    expect(startVarianceMinutes(null, "06:00")).toBeNull();
    expect(startVarianceMinutes("06:00", null)).toBeNull();
    expect(startVarianceMinutes("", "06:00")).toBeNull();
    expect(startVarianceMinutes("6am", "06:00")).toBeNull();
    expect(startVarianceMinutes("25:00", "06:00")).toBeNull();
    expect(startVarianceMinutes("06:99", "06:00")).toBeNull();
  });
});

describe("punctuality", () => {
  const facts = [
    { truckId: "T1", rostered: "06:00", actual: "06:03" }, // on time (grace 5)
    { truckId: "T1", rostered: "06:00", actual: "06:30" }, // late 30
    { truckId: "T2", rostered: "06:00", actual: "05:50" }, // early
    { truckId: "T3", rostered: "06:00", actual: null }, // no actual -> ignored
    { truckId: "T4", rostered: null, actual: "06:10" }, // no plan -> ignored
  ];

  it("only compares rows that have both sides", () => {
    expect(punctuality(facts).compared).toBe(3);
  });

  it("classifies on time, late and early against the grace window", () => {
    const p = punctuality(facts);
    expect(p).toMatchObject({ onTime: 1, late: 1, early: 1 });
    expect(p.onTimePct).toBeCloseTo(1 / 3);
  });

  it("averages the signed variance", () => {
    // +3, +30, -10 -> 23/3
    expect(punctuality(facts).avgVarianceMinutes).toBeCloseTo(7.7, 1);
  });

  it("ranks repeat offenders with their average lateness", () => {
    const p = punctuality(facts);
    expect(p.worst).toEqual([{ truck: "T1", late: 1, compared: 2, avgLateMinutes: 30 }]);
  });

  it("a tighter grace window reclassifies borderline departures", () => {
    expect(punctuality(facts, 1).onTime).toBe(0);
  });

  it("handles no comparable data without dividing by zero", () => {
    expect(punctuality([])).toMatchObject({ compared: 0, onTimePct: 0, avgVarianceMinutes: 0, worst: [] });
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
