import { describe, expect, it } from "vitest";
import { availFor, awayPlant, hostBlockFor, isOnRoad, parseTimeEntry, statusKind, statusLabel, TRUCK_STATUS_CODES } from "./fleet";

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

describe("awayPlant — lent-out detection by first word", () => {
  it("home plant (however the sheet spells it) is not away", () => {
    expect(awayPlant("CAMELLIA CONCRETE", "Camellia")).toBeNull();
    expect(awayPlant("BROOKVALE PRIMARY CONCRETE", "Brookvale")).toBeNull();
    expect(awayPlant(null, "Camellia")).toBeNull();
    expect(awayPlant("", "Camellia")).toBeNull();
  });

  it("a different plant reads as a tidy away label", () => {
    expect(awayPlant("CAMELLIA CONCRETE", "Banksmeadow")).toBe("Camellia");
    expect(awayPlant("GREENACRE CONCRETE", "Prestons")).toBe("Greenacre");
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

describe("hostBlockFor — which block hosts a lent-out truck", () => {
  const BLOCKS = ["Greenacre Metro", "Greenacre Project", "Camellia Metro", "Camellia Project", "Pyrmont Project"];

  it("prefers the host block with the same suffix as home", () => {
    expect(hostBlockFor("Greenacre Metro", "Camellia", BLOCKS)).toBe("Camellia Metro");
    expect(hostBlockFor("Greenacre Project", "Camellia", BLOCKS)).toBe("Camellia Project");
  });

  it("falls back to the plant's first block when the suffix has no match", () => {
    expect(hostBlockFor("Greenacre Metro", "Pyrmont", BLOCKS)).toBe("Pyrmont Project");
  });

  it("null for a plant with no blocks — the truck stays listed at home", () => {
    expect(hostBlockFor("Greenacre Metro", "Bathurst", BLOCKS)).toBeNull();
    expect(hostBlockFor("Greenacre Metro", "", BLOCKS)).toBeNull();
  });

  it("matches the plant case-insensitively", () => {
    expect(hostBlockFor("Greenacre Metro", "camellia", BLOCKS)).toBe("Camellia Metro");
  });
});

describe("parseTimeEntry — the dispatcher's typed 24-hour time", () => {
  it("takes the common shapes", () => {
    expect(parseTimeEntry("1430")).toBe("14:30");
    expect(parseTimeEntry("14:30")).toBe("14:30");
    expect(parseTimeEntry("930")).toBe("09:30");
    expect(parseTimeEntry("9:30")).toBe("09:30");
    expect(parseTimeEntry("9.30")).toBe("09:30");
    expect(parseTimeEntry(" 05:00 ")).toBe("05:00");
  });

  it("a bare hour means on the hour", () => {
    expect(parseTimeEntry("14")).toBe("14:00");
    expect(parseTimeEntry("9")).toBe("09:00");
    expect(parseTimeEntry("0")).toBe("00:00");
  });

  it("honours a stubborn am/pm habit", () => {
    expect(parseTimeEntry("2:30pm")).toBe("14:30");
    expect(parseTimeEntry("930am")).toBe("09:30");
    expect(parseTimeEntry("12am")).toBe("00:00");
    expect(parseTimeEntry("12pm")).toBe("12:00");
  });

  it("rejects what isn't a time", () => {
    expect(parseTimeEntry("2460")).toBeNull();
    expect(parseTimeEntry("14:70")).toBeNull();
    expect(parseTimeEntry("95")).toBeNull();
    expect(parseTimeEntry("abc")).toBeNull();
    expect(parseTimeEntry("")).toBeNull();
  });
});
