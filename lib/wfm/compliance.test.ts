import { describe, expect, it } from "vitest";
import { credentialState, daysUntil, runLengthEndingAt, toDayKeySet } from "./compliance";
import { dateFromKey } from "./date";

const today = dateFromKey("2026-08-10");

describe("credentialState", () => {
  it("no expiry date never expires", () => {
    expect(credentialState(null, today, 30)).toBe("ok");
  });

  it("covers today, expires from tomorrow", () => {
    expect(credentialState(dateFromKey("2026-08-10"), today, 30)).toBe("expiring"); // 0 days left
    expect(credentialState(dateFromKey("2026-08-09"), today, 30)).toBe("expired");
  });

  it("warnDays draws the expiring window per type", () => {
    expect(credentialState(dateFromKey("2026-09-08"), today, 30)).toBe("expiring"); // 29 days
    expect(credentialState(dateFromKey("2026-09-09"), today, 30)).toBe("ok"); // exactly 30
    expect(credentialState(dateFromKey("2026-08-11"), today, 0)).toBe("ok"); // warnDays 0 = never warn
  });

  it("daysUntil counts signed days", () => {
    expect(daysUntil(dateFromKey("2026-08-13"), today)).toBe(3);
    expect(daysUntil(dateFromKey("2026-08-07"), today)).toBe(-3);
  });
});

describe("runLengthEndingAt — consecutive days worked", () => {
  it("zero when the day itself is off", () => {
    expect(runLengthEndingAt(new Set(), "2026-08-10")).toBe(0);
    expect(runLengthEndingAt(new Set(["2026-08-09"]), "2026-08-10")).toBe(0);
  });

  it("counts back until the first gap", () => {
    const worked = toDayKeySet([
      dateFromKey("2026-08-10"),
      dateFromKey("2026-08-09"),
      dateFromKey("2026-08-08"),
      // gap on the 7th
      dateFromKey("2026-08-06"),
    ]);
    expect(runLengthEndingAt(worked, "2026-08-10")).toBe(3);
    expect(runLengthEndingAt(worked, "2026-08-06")).toBe(1);
  });

  it("handles a fortnight straight across a month boundary", () => {
    const worked = new Set<string>();
    let key = "2026-07-28";
    for (let i = 0; i < 14; i++) {
      worked.add(key);
      key = key === "2026-07-31" ? "2026-08-01" : `${key.slice(0, 8)}${String(Number(key.slice(8)) + 1).padStart(2, "0")}`;
    }
    expect(runLengthEndingAt(worked, "2026-08-10")).toBe(14);
  });
});
