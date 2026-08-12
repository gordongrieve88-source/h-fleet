import { describe, expect, it } from "vitest";
import { roleFromClaims, profileFromClaims } from "./entra-profile";

describe("roleFromClaims — Entra app roles to H-Fleet roles", () => {
  it("maps the three app roles, case-insensitively", () => {
    expect(roleFromClaims(["Manager"])).toBe("MANAGER");
    expect(roleFromClaims(["supervisor"])).toBe("SUPERVISOR");
    expect(roleFromClaims(["STAFF"])).toBe("STAFF");
  });

  it("the highest assigned role wins", () => {
    expect(roleFromClaims(["Staff", "Manager"])).toBe("MANAGER");
    expect(roleFromClaims(["Staff", "Supervisor"])).toBe("SUPERVISOR");
  });

  it("unknown role names fall back to view-only Staff", () => {
    expect(roleFromClaims(["Administrator"])).toBe("STAFF");
  });

  it("no roles claim = null (keep the app-stored role)", () => {
    expect(roleFromClaims(undefined)).toBeNull();
    expect(roleFromClaims([])).toBeNull();
    expect(roleFromClaims("Manager")).toBeNull(); // must be an array
  });
});

describe("profileFromClaims", () => {
  const base = { oid: "11111111-aaaa-bbbb-cccc-222222222222" };

  it("requires the Entra object id", () => {
    expect(profileFromClaims({})).toBeNull();
    expect(profileFromClaims({ oid: 42 })).toBeNull();
  });

  it("prefers the display name, then UPN, and finds an email", () => {
    const p = profileFromClaims({ ...base, name: "Gordon Grieve", preferred_username: "gordon@example.com" });
    expect(p).toMatchObject({ oid: base.oid, displayName: "Gordon Grieve", email: "gordon@example.com" });
  });

  it("a UPN that isn't an email is not treated as one", () => {
    const p = profileFromClaims({ ...base, preferred_username: "EXAMPLE\\gordon" });
    expect(p?.email).toBeNull();
    expect(p?.displayName).toBe("EXAMPLE\\gordon");
  });

  it("carries the mapped role through", () => {
    expect(profileFromClaims({ ...base, roles: ["Supervisor"] })?.role).toBe("SUPERVISOR");
    expect(profileFromClaims({ ...base })?.role).toBeNull();
  });
});
