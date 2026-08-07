import { describe, expect, it } from "vitest";
import { availFor, isOnRoad, statusKind, statusLabel, TRUCK_STATUS_CODES } from "./fleet";

describe("statusKind", () => {
  it("classifies the spreadsheet codes", () => {
    expect(statusKind("ON")).toBe("on");
    expect(statusKind("ON-FTO")).toBe("on");
    expect(statusKind("ON-SER")).toBe("warn");
    expect(statusKind("ON-DED")).toBe("warn");
    expect(statusKind("OFF-BD")).toBe("off");
    expect(statusKind("OFF-ND")).toBe("off");
  });

  it("is case- and whitespace-tolerant (codes come from stored data)", () => {
    expect(statusKind(" on-ser ")).toBe("warn");
    expect(statusKind("off-bd")).toBe("off");
  });

  it("defaults unknown codes to on-road rather than crashing the board", () => {
    expect(statusKind("SOMETHING-NEW")).toBe("on");
  });

  it("covers every declared status code", () => {
    for (const code of TRUCK_STATUS_CODES) expect(["on", "warn", "off"]).toContain(statusKind(code));
  });
});

describe("statusLabel", () => {
  it("resolves known codes and echoes unknown ones", () => {
    expect(statusLabel("OFF-ND")).toBe("Driver not in / leave");
    expect(statusLabel("MYSTERY")).toBe("MYSTERY");
  });
});

describe("isOnRoad", () => {
  it("treats any ON* code as on road", () => {
    expect(isOnRoad("ON")).toBe(true);
    expect(isOnRoad("ON-LS")).toBe(true);
    expect(isOnRoad(" on-fto ")).toBe(true);
    expect(isOnRoad("OFF")).toBe(false);
    expect(isOnRoad("OFF-BD")).toBe(false);
  });
});

describe("availFor", () => {
  it("handles an empty board without dividing by zero", () => {
    expect(availFor([])).toEqual({ on: 0, off: 0, needsCover: 0, total: 0, pct: 0 });
  });

  it("counts on/off and the availability percentage", () => {
    const rows = [
      { status: "ON", driverId: 1 },
      { status: "ON-FTO", driverId: 2 },
      { status: "OFF-BD", driverId: 3 },
      { status: "OFF-PAR", driverId: null },
    ];
    const a = availFor(rows);
    expect(a.on).toBe(2);
    expect(a.off).toBe(2);
    expect(a.total).toBe(4);
    expect(a.pct).toBeCloseTo(0.5);
  });

  it("needs-cover = driverless trucks that are on road or waiting on a driver", () => {
    const rows = [
      { status: "ON", driverId: null }, // on road with nobody in it -> cover
      { status: "OFF-ND", driverId: null }, // driver not in -> cover
      { status: "OFF-BD", driverId: null }, // broken down -> NOT a cover problem
      { status: "ON", driverId: 9 }, // crewed -> fine
    ];
    expect(availFor(rows).needsCover).toBe(2);
  });
});
