import { describe, expect, it } from "vitest";
import { regionsForGroup } from "./regions";

/**
 * The depot editor's region menu follows the dispatch group picked above it.
 */
const REGIONS = [
  { name: "Metro East", groupCode: "301" },
  { name: "Metro West", groupCode: "301" },
  { name: "Northern", groupCode: "302" },
  { name: "Projects", groupCode: null },
];

describe("regions offered for a dispatch group", () => {
  it("offers that group's regions, plus the ungrouped ones", () => {
    expect(regionsForGroup(REGIONS, "301").map((r) => r.name)).toEqual(["Metro East", "Metro West", "Projects"]);
    expect(regionsForGroup(REGIONS, "302").map((r) => r.name)).toEqual(["Northern", "Projects"]);
  });

  it("offers every region when the depot is in no group — no group, no filter", () => {
    expect(regionsForGroup(REGIONS, null)).toEqual(REGIONS);
    expect(regionsForGroup(REGIONS, "")).toEqual(REGIONS);
  });

  it("keeps the depot's current region listed, so opening the dialog can't move it", () => {
    expect(regionsForGroup(REGIONS, "302", "Metro East").map((r) => r.name)).toEqual([
      "Metro East",
      "Northern",
      "Projects",
    ]);
  });

  it("returns nothing when a group has no regions of its own yet", () => {
    const grouped = REGIONS.filter((r) => r.groupCode !== null);
    expect(regionsForGroup(grouped, "304")).toEqual([]);
  });
});
