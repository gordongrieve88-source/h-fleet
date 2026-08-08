import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { extractPdfLines } from "./pdf";
import { parseAllocationLines, type ParsedEntry } from "./syncrotess";

/**
 * REGRESSION FIXTURE: a real Syncrotess "Dispatch Group 301" roster
 * (08/08/2026). This is the exact format production must parse: no driver
 * names at all — Time | Name(=truck) | Actual Type | Contract Type |
 * Default Parking | Location | SAS — with dispatch-group suffixes on some
 * fleet codes and page headers/footers mid-stream.
 */
const ctx = {
  truckIds: ["PLC2267", "PLC2213", "PCX2028", "PLC2717", "PCC2061", "PCX2178"],
  drivers: [
    // Traps: real HMA employee numbers are 1–3 digits, so the structural "02"
    // (truck type) and "301" (dispatch group) columns MUST NOT match them.
    { id: 1, name: "Trap Two", empNo: "02" },
    { id: 2, name: "Trap Group", empNo: "301" },
  ],
};

let entries: ParsedEntry[];
let dateKey: string | null;

beforeAll(async () => {
  const pdf = readFileSync(path.resolve(import.meta.dirname, "../../test/fixtures/syncrotess-roster-2026-08-08.pdf"));
  const lines = await extractPdfLines(pdf);
  ({ entries, dateKey } = parseAllocationLines(lines, ctx));
});

describe("real Syncrotess roster", () => {
  it("reads the sheet date from the header, not the print footer", () => {
    expect(dateKey).toBe("2026-08-08");
  });

  it("finds every allocation row, each with a start time", () => {
    expect(entries.length).toBeGreaterThanOrEqual(90);
    expect(entries.every((e) => e.time !== null)).toBe(true);
  });

  it("strips the dispatch-group suffix so PLC2213-301 matches PLC2213", () => {
    const e = entries.find((x) => x.truckToken === "PLC2213-301");
    expect(e).toMatchObject({ truckId: "PLC2213", time: "06:50" });
  });

  it("carries the Location column — including trucks lent to another plant", () => {
    expect(entries.find((x) => x.truckToken === "PLC2267")?.location).toBe("ARTARMON CONCRETE");
    // PLC2717 parks at Banksmeadow but works Camellia this day.
    expect(entries.find((x) => x.truckToken === "PLC2717")?.location).toBe("CAMELLIA CONCRETE");
  });

  it("NEVER invents a driver from structural numbers (frequency guard)", () => {
    expect(entries.every((e) => e.driverId === null)).toBe(true);
  });

  it("flags codes that aren't in the fleet instead of guessing", () => {
    const unknown = entries.filter((e) => e.status === "unknown-truck");
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown.every((e) => e.truckId === null)).toBe(true);
  });
});
