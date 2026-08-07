import { describe, expect, it } from "vitest";
import { resolveDepotScope, depotInScope } from "./scope";
import { ROLES } from "./roles";

describe("resolveDepotScope", () => {
  it("managers are always unrestricted, even with scope rows", () => {
    expect(resolveDepotScope(ROLES.MANAGER, [])).toBeNull();
    expect(resolveDepotScope(ROLES.MANAGER, [1, 2])).toBeNull();
  });

  it("a supervisor with no scope rows is unrestricted (scoping is opt-in)", () => {
    expect(resolveDepotScope(ROLES.SUPERVISOR, [])).toBeNull();
  });

  it("a scoped supervisor gets exactly their depots", () => {
    expect(resolveDepotScope(ROLES.SUPERVISOR, [3, 7])).toEqual([3, 7]);
  });

  it("non-edit roles get NO depots regardless of rows", () => {
    expect(resolveDepotScope(ROLES.STAFF, [])).toEqual([]);
    expect(resolveDepotScope(ROLES.STAFF, [1])).toEqual([]);
    expect(resolveDepotScope("SOMETHING_ELSE", [1])).toEqual([]);
  });
});

describe("depotInScope", () => {
  it("null scope allows every depot", () => {
    expect(depotInScope(null, 1)).toBe(true);
    expect(depotInScope(null, 999)).toBe(true);
  });

  it("a list allows only its members", () => {
    expect(depotInScope([3, 7], 3)).toBe(true);
    expect(depotInScope([3, 7], 4)).toBe(false);
  });

  it("an empty scope allows nothing", () => {
    expect(depotInScope([], 1)).toBe(false);
  });
});
