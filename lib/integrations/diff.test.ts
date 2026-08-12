import { describe, expect, it } from "vitest";
import { diffBalances, diffPeople, matchDepot, type CurrentDriver } from "./diff";
import type { ExternalPerson } from "./types";

const depots = [
  { id: 1, name: "Greenacre" },
  { id: 2, name: "Prestons" },
];

const current: CurrentDriver[] = [
  { id: 10, employeeNo: "101", name: "Alpha Driver", depotId: 1, depotName: "Greenacre", workgroup: "Metro", isActive: true },
  { id: 11, employeeNo: "102", name: "Bravo Driver", depotId: 2, depotName: "Prestons", workgroup: "LOD", isActive: true },
  { id: 12, employeeNo: "103", name: "Gone Driver", depotId: 1, depotName: "Greenacre", workgroup: "", isActive: false },
];

const person = (over: Partial<ExternalPerson>): ExternalPerson => ({
  employeeNo: "101",
  name: "Alpha Driver",
  depotName: "Greenacre",
  workgroup: "Metro",
  isActive: true,
  ...over,
});

describe("matchDepot — HR names depots differently to us", () => {
  it("matches on the first word, case-insensitively", () => {
    expect(matchDepot("GREENACRE CONCRETE", depots)).toBe(1);
    expect(matchDepot("prestons", depots)).toBe(2);
  });
  it("returns null for depots we don't have", () => {
    expect(matchDepot("Timbuktu Concrete", depots)).toBeNull();
    expect(matchDepot("", depots)).toBeNull();
  });
});

describe("diffPeople", () => {
  it("reports nothing to do when the feed matches", () => {
    const d = diffPeople([person({}), person({ employeeNo: "102", name: "Bravo Driver", depotName: "Prestons", workgroup: "LOD" })], current, depots);
    expect(d.toCreate).toEqual([]);
    expect(d.toUpdate).toEqual([]);
    expect(d.toDeactivate).toEqual([]);
    expect(d.unchanged).toBe(2);
  });

  it("creates new starters, resolving their depot", () => {
    const d = diffPeople([person({ employeeNo: "999", name: "New Starter", depotName: "PRESTONS CONCRETE" })], current, depots);
    expect(d.toCreate).toHaveLength(1);
    expect(d.toCreate[0]).toMatchObject({ employeeNo: "999", depotId: 2 });
  });

  it("flags a new starter whose depot we don't have, rather than guessing", () => {
    const d = diffPeople([person({ employeeNo: "999", depotName: "Nowhere" })], current, depots);
    expect(d.toCreate[0].depotId).toBeNull();
  });

  it("detects name, depot and workgroup changes with before/after", () => {
    const d = diffPeople([person({ name: "Alpha Renamed", depotName: "Prestons", workgroup: "Project" })], current, depots);
    expect(d.toUpdate).toHaveLength(1);
    expect(d.toUpdate[0].changes.map((c) => c.field).sort()).toEqual(["depot", "name", "workgroup"]);
    expect(d.toUpdate[0].changes.find((c) => c.field === "name")).toMatchObject({ from: "Alpha Driver", to: "Alpha Renamed" });
  });

  it("deactivates leavers", () => {
    const d = diffPeople([person({ isActive: false })], current, depots);
    expect(d.toDeactivate).toEqual([{ driverId: 10, employeeNo: "101", name: "Alpha Driver" }]);
  });

  it("reactivates someone who came back", () => {
    const d = diffPeople([person({ employeeNo: "103", name: "Gone Driver", workgroup: "" })], current, depots);
    expect(d.toUpdate[0].changes).toContainEqual({ field: "status", from: "inactive", to: "active" });
  });

  it("never creates a driver who is already inactive in the feed", () => {
    const d = diffPeople([person({ employeeNo: "888", isActive: false })], current, depots);
    expect(d.toCreate).toEqual([]);
  });

  it("reports active drivers missing from the feed WITHOUT touching them", () => {
    const d = diffPeople([person({})], current, depots);
    expect(d.unmatched.map((u) => u.employeeNo)).toEqual(["102"]);
    expect(d.toDeactivate).toEqual([]);
  });

  it("ignores feed rows with no employee number", () => {
    const d = diffPeople([person({ employeeNo: "  " })], current, depots);
    expect(d.toCreate).toEqual([]);
    expect(d.toUpdate).toEqual([]);
  });

  it("tolerates whitespace around employee numbers", () => {
    const d = diffPeople([person({ employeeNo: " 101 ", name: "Alpha Renamed" })], current, depots);
    expect(d.toUpdate).toHaveLength(1);
    expect(d.toCreate).toEqual([]);
  });
});

describe("diffBalances", () => {
  const existing = [{ driverId: 10, leaveTypeCode: "AL", year: 2026, entitledDays: 20, openingBalance: 3 }];

  it("upserts only what actually changed", () => {
    const r = diffBalances(
      [
        { employeeNo: "101", leaveTypeCode: "AL", year: 2026, entitledDays: 20, openingBalance: 3 },
        { employeeNo: "102", leaveTypeCode: "AL", year: 2026, entitledDays: 20, openingBalance: 1.5 },
      ],
      current,
      existing,
    );
    expect(r.unchanged).toBe(1);
    expect(r.toUpsert).toHaveLength(1);
    expect(r.toUpsert[0]).toMatchObject({ driverId: 11, entitledDays: 20, openingBalance: 1.5, fromEntitled: null });
  });

  it("reports employees it can't match instead of dropping them silently", () => {
    const r = diffBalances([{ employeeNo: "404", leaveTypeCode: "AL", year: 2026, entitledDays: 20, openingBalance: 0 }], current, existing);
    expect(r.unknownEmployees).toEqual(["404"]);
    expect(r.toUpsert).toEqual([]);
  });

  it("carries the prior entitlement so a change can be shown", () => {
    const r = diffBalances([{ employeeNo: "101", leaveTypeCode: "AL", year: 2026, entitledDays: 25, openingBalance: 3 }], current, existing);
    expect(r.toUpsert[0]).toMatchObject({ entitledDays: 25, fromEntitled: 20 });
  });
});
