import { afterEach, describe, expect, it, vi } from "vitest";
import { countDays, daysInMonth, shiftMonth, splitRange } from "./leave";

// August 2026: Sat 1, Sun 2, Mon 3 ... Fri 7, Sat 8, Sun 9, Mon 10 ...
afterEach(() => vi.useRealTimers());

describe("splitRange — bookings become contiguous working-day runs", () => {
  it("keeps a Mon–Fri week as one run", () => {
    expect(splitRange("2026-08-03", "2026-08-07", false)).toEqual([{ start: "2026-08-03", end: "2026-08-07" }]);
  });

  it("splits across a weekend into two runs", () => {
    expect(splitRange("2026-08-06", "2026-08-11", false)).toEqual([
      { start: "2026-08-06", end: "2026-08-07" },
      { start: "2026-08-10", end: "2026-08-11" },
    ]);
  });

  it("includeSat pulls Saturday into the run but never Sunday", () => {
    expect(splitRange("2026-08-06", "2026-08-11", true)).toEqual([
      { start: "2026-08-06", end: "2026-08-08" },
      { start: "2026-08-10", end: "2026-08-11" },
    ]);
  });

  it("a weekend-only selection books nothing", () => {
    expect(splitRange("2026-08-09", "2026-08-09", false)).toEqual([]);
    expect(splitRange("2026-08-08", "2026-08-09", false)).toEqual([]);
  });

  it("tolerates a reversed range and an empty 'to'", () => {
    expect(splitRange("2026-08-07", "2026-08-03", false)).toEqual([{ start: "2026-08-03", end: "2026-08-07" }]);
    expect(splitRange("2026-08-05", "", false)).toEqual([{ start: "2026-08-05", end: "2026-08-05" }]);
  });

  it("returns nothing for malformed input", () => {
    expect(splitRange("not-a-date", "2026-08-07", false)).toEqual([]);
  });
});

describe("countDays — what the AL balance is debited", () => {
  it("a calendar fortnight is 10 working days (12 with Saturdays)", () => {
    expect(countDays("2026-08-03", "2026-08-16", false)).toBe(10);
    expect(countDays("2026-08-03", "2026-08-16", true)).toBe(12);
  });

  it("a single weekday is one day; a Sunday is zero", () => {
    expect(countDays("2026-08-05", "2026-08-05", false)).toBe(1);
    expect(countDays("2026-08-09", "2026-08-09", true)).toBe(0);
  });
});

describe("daysInMonth — the planner grid", () => {
  it("knows month lengths, including leap February", () => {
    expect(daysInMonth("2026-02")).toHaveLength(28);
    expect(daysInMonth("2028-02")).toHaveLength(29);
    expect(daysInMonth("2026-08")).toHaveLength(31);
  });

  it("flags weekends and today (in Sydney terms)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T20:30:00Z")); // 07 Aug, 06:30 in Sydney
    const days = daysInMonth("2026-08");
    expect(days[0]).toMatchObject({ iso: "2026-08-01", num: 1, isWeekend: true }); // Saturday
    expect(days[2]).toMatchObject({ iso: "2026-08-03", isWeekend: false }); // Monday
    expect(days.find((d) => d.isToday)?.iso).toBe("2026-08-07");
  });
});

describe("shiftMonth", () => {
  it("moves across year boundaries both ways", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-06", 0)).toBe("2026-06");
  });
});
