import { describe, expect, it } from "vitest";
import { appliesInState, credentialState, daysUntil, runLengthEndingAt, statesLabel, toDayKeySet } from "./compliance";
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

describe("appliesInState — which jurisdictions a credential covers", () => {
  it("ALL (or blank) applies everywhere", () => {
    expect(appliesInState("ALL", "NSW")).toBe(true);
    expect(appliesInState("all", "VIC")).toBe(true);
    expect(appliesInState("", "QLD")).toBe(true);
    expect(appliesInState(null, "WA")).toBe(true);
    expect(appliesInState(undefined, "SA")).toBe(true);
  });

  it("a scoped credential applies only in its own states", () => {
    expect(appliesInState("NSW", "NSW")).toBe(true);
    expect(appliesInState("NSW", "VIC")).toBe(false);
    expect(appliesInState("NSW,VIC", "VIC")).toBe(true);
    expect(appliesInState("NSW,VIC", "QLD")).toBe(false);
  });

  it("tolerates spacing and casing from hand-edited data", () => {
    expect(appliesInState(" nsw , vic ", "VIC")).toBe(true);
    expect(appliesInState("NSW,VIC", " vic ")).toBe(true);
  });

  it("fails OPEN, never closed — a malformed scope must not hide a licence rule", () => {
    expect(appliesInState(",,,", "NSW")).toBe(true);
    expect(appliesInState("   ", "NSW")).toBe(true);
  });

  it("an unknown state simply doesn't match a scoped credential", () => {
    expect(appliesInState("NSW", "NZ")).toBe(false);
  });
});

describe("statesLabel", () => {
  it("reads naturally in the UI", () => {
    expect(statesLabel("ALL")).toBe("All states");
    expect(statesLabel("")).toBe("All states");
    expect(statesLabel("NSW")).toBe("NSW");
    expect(statesLabel("NSW,VIC")).toBe("NSW · VIC");
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
