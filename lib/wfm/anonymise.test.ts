import { describe, expect, it } from "vitest";
import { anonymiseDrivers, anonymiseRequested } from "@/prisma/seed-data/anonymise";
import { DRIVERS as REAL_DRIVERS } from "@/prisma/seed-data/fleet-data";

/**
 * The anonymised seed is what makes a reachable demo safe to publish. If it
 * ever stops replacing every real name, that's a privacy incident, not a bug —
 * so it's asserted against the actual fleet data, not a fixture.
 */

describe("anonymiseDrivers", () => {
  const fake = anonymiseDrivers(REAL_DRIVERS);

  it("replaces every real name", () => {
    const realNames = new Set(REAL_DRIVERS.map((d) => d.name));
    for (const d of fake) expect(realNames.has(d.name)).toBe(false);
  });

  it("replaces every real employee number", () => {
    const realNumbers = new Set(REAL_DRIVERS.map((d) => String(d.emp)));
    for (const d of fake) expect(realNumbers.has(String(d.emp))).toBe(false);
  });

  it("keeps the fleet the same size and shape", () => {
    expect(fake).toHaveLength(REAL_DRIVERS.length);
    // Depot, workgroup and the internal key are not personal information, and
    // the demo describes a real fleet — so they must survive untouched.
    for (let i = 0; i < fake.length; i++) {
      expect(fake[i].id).toBe(REAL_DRIVERS[i].id);
      expect(fake[i].plant).toBe(REAL_DRIVERS[i].plant);
      expect(fake[i].workgroup).toBe(REAL_DRIVERS[i].workgroup);
    }
  });

  it("gives every driver a distinct name — a repeat would read as a double-assignment", () => {
    expect(new Set(fake.map((d) => d.name)).size).toBe(fake.length);
  });

  it("gives every driver a distinct employee number", () => {
    expect(new Set(fake.map((d) => d.emp)).size).toBe(fake.length);
  });

  it("is deterministic, so screenshots survive a re-seed", () => {
    expect(anonymiseDrivers(REAL_DRIVERS).map((d) => d.name)).toEqual(fake.map((d) => d.name));
  });

  it("produces a full name for everyone", () => {
    for (const d of fake) expect(d.name).toMatch(/^\S+ \S+/);
  });

  it("never repeats the given name as the surname", () => {
    // Both pools carry a few of the same names; "Ahmed Ahmed" on the board
    // reads as broken data rather than a person.
    for (const d of fake) {
      const [given, ...rest] = d.name.split(" ");
      expect(rest.join(" ")).not.toBe(given);
    }
  });
});

describe("anonymiseRequested", () => {
  it("is off unless asked for — local development keeps the real fleet", () => {
    expect(anonymiseRequested({})).toBe(false);
    expect(anonymiseRequested({ SEED_ANONYMISE: "" })).toBe(false);
    expect(anonymiseRequested({ SEED_ANONYMISE: "0" })).toBe(false);
    expect(anonymiseRequested({ SEED_ANONYMISE: "false" })).toBe(false);
  });

  it("accepts the spellings a deploy config is likely to use", () => {
    for (const v of ["1", "true", "TRUE", "yes", " Yes "]) {
      expect(anonymiseRequested({ SEED_ANONYMISE: v })).toBe(true);
    }
  });
});
