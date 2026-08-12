import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdfLines } from "./pdf";
import { parseAllocationLines } from "./syncrotess";

const fixture = () => readFileSync(path.resolve(import.meta.dirname, "../../test/fixtures/syncrotess-sample.pdf"));

const ctx = {
  truckIds: ["T1", "T2", "T3"],
  drivers: [
    { id: 1, name: "Alpha Driver", empNo: "101" },
    { id: 2, name: "Bravo Driver", empNo: "102" },
    { id: 3, name: "Charlie Driver", empNo: "103" },
  ],
};

describe("PDF -> lines -> allocations (the whole import pipeline)", () => {
  it("extracts the sheet as one line per row", async () => {
    const lines = await extractPdfLines(fixture());
    expect(lines.some((l) => l.includes("T1") && l.includes("Alpha Driver") && l.includes("05:30"))).toBe(true);
    expect(lines.some((l) => l.includes("TX999"))).toBe(true);
  });

  it("parses the fixture sheet exactly as the preview will show it", async () => {
    const lines = await extractPdfLines(fixture());
    const { dateKey, entries } = parseAllocationLines(lines, ctx);

    expect(dateKey).toBe("2026-08-08");
    const first = (token: string) => entries.find((e) => e.truckToken === token);
    expect(first("T1")).toMatchObject({ driverId: 1, time: "05:30", status: "ok" });
    expect(first("T2")).toMatchObject({ driverId: 2, time: "06:15", status: "ok" }); // "Driver, Bravo" + "6:15 am"
    expect(first("T3")).toMatchObject({ driverId: null, time: "07:00", status: "no-driver" });
    expect(first("TX999")).toMatchObject({ truckId: null, status: "unknown-truck" });
    // The second T1 row is the duplicate.
    expect(entries.filter((e) => e.truckToken === "T1")[1].status).toBe("duplicate");
  });
});
