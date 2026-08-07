import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDaysKey,
  addDaysUTC,
  atMidnightUTC,
  dateFromKey,
  fmtDate,
  fmtRange,
  isWeekendKey,
  mondayOf,
  parseYmdOrNull,
  todayKey,
  todayUTC,
  ymd,
} from "./date";

afterEach(() => vi.useRealTimers());

describe("key <-> Date round trips", () => {
  it("ymd(dateFromKey(k)) === k", () => {
    expect(ymd(dateFromKey("2026-08-07"))).toBe("2026-08-07");
    expect(ymd(dateFromKey("2026-01-01"))).toBe("2026-01-01");
  });

  it("atMidnightUTC strips time-of-day", () => {
    expect(atMidnightUTC(new Date("2026-08-07T17:45:12Z")).toISOString()).toBe("2026-08-07T00:00:00.000Z");
  });
});

describe("todayKey / todayUTC — anchored to the team's day, not UTC's", () => {
  it("early Sydney morning is already 'tomorrow' by UTC's clock", () => {
    // 20:30 UTC on the 6th = 06:30 AEST on the 7th. A UTC-based "today"
    // would show yesterday's board first thing in the morning — the exact
    // bug this anchor exists to prevent.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T20:30:00Z"));
    expect(todayKey()).toBe("2026-08-07");
    expect(ymd(todayUTC())).toBe("2026-08-07");
  });

  it("Sydney evening is still the same calendar day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T10:00:00Z")); // 20:00 AEST on the 7th
    expect(todayKey()).toBe("2026-08-07");
  });
});

describe("day arithmetic", () => {
  it("addDaysUTC rolls over month and year boundaries", () => {
    expect(ymd(addDaysUTC(dateFromKey("2026-08-31"), 1))).toBe("2026-09-01");
    expect(ymd(addDaysUTC(dateFromKey("2026-12-31"), 1))).toBe("2027-01-01");
    expect(ymd(addDaysUTC(dateFromKey("2026-03-01"), -1))).toBe("2026-02-28");
    expect(ymd(addDaysUTC(dateFromKey("2028-03-01"), -1))).toBe("2028-02-29"); // leap year
  });

  it("addDaysKey is the same maths on keys", () => {
    expect(addDaysKey("2026-08-07", 1)).toBe("2026-08-08");
    expect(addDaysKey("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("mondayOf finds the ISO week start from any weekday", () => {
    expect(ymd(mondayOf(dateFromKey("2026-08-03")))).toBe("2026-08-03"); // Monday itself
    expect(ymd(mondayOf(dateFromKey("2026-08-06")))).toBe("2026-08-03"); // Thursday
    expect(ymd(mondayOf(dateFromKey("2026-08-09")))).toBe("2026-08-03"); // Sunday belongs to the week before
  });

  it("isWeekendKey", () => {
    expect(isWeekendKey("2026-08-08")).toBe(true); // Saturday
    expect(isWeekendKey("2026-08-09")).toBe(true); // Sunday
    expect(isWeekendKey("2026-08-10")).toBe(false); // Monday
  });
});

describe("parseYmdOrNull — tolerant URL param parsing", () => {
  it("accepts well-formed keys", () => {
    expect(parseYmdOrNull("2026-08-07")?.toISOString()).toBe("2026-08-07T00:00:00.000Z");
  });

  it("rejects missing, malformed, and impossible dates", () => {
    expect(parseYmdOrNull(null)).toBeNull();
    expect(parseYmdOrNull(undefined)).toBeNull();
    expect(parseYmdOrNull("")).toBeNull();
    expect(parseYmdOrNull("07/08/2026")).toBeNull();
    expect(parseYmdOrNull("2026-8-7")).toBeNull();
    expect(parseYmdOrNull("2026-13-01")).toBeNull();
    expect(parseYmdOrNull("2026-02-30")).toBeNull();
    expect(parseYmdOrNull("hello")).toBeNull();
  });
});

describe("display formatting (always UTC so keys never shift a day)", () => {
  // August, because en-AU's CLDR "short" months spell June/July out in full.
  it("fmtDate / fmtRange", () => {
    expect(fmtDate(dateFromKey("2026-08-09"))).toBe("9 Aug 2026");
    expect(fmtRange(dateFromKey("2026-08-09"), dateFromKey("2026-08-14"))).toBe("9 Aug – 14 Aug 2026");
    expect(fmtRange(dateFromKey("2026-08-09"), dateFromKey("2026-08-09"))).toBe("9 Aug 2026");
  });
});
