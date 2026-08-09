/**
 * Replaces the real fleet's people with invented ones, for demo instances
 * that live somewhere a stranger could reach.
 *
 * The 194 drivers in fleet-data.ts are real employees. Their names, employee
 * numbers, leave and now their credentials are personal information — fine on
 * a laptop, not fine on a public URL. Set SEED_ANONYMISE=1 and the seed builds
 * exactly the same fleet with invented people in it: same headcount, same
 * depots, same trucks, same leave patterns, same everything a demo shows.
 *
 * What is NOT touched: depots, regions, truck fleet codes, workgroups, leave
 * dates. None of it identifies anybody, and changing it would make the demo
 * describe a fleet that doesn't exist.
 *
 * Deterministic — driver `d17` is the same invented person every rebuild, so
 * screenshots and demo scripts don't go stale between re-seeds.
 */

export interface AnonymisableDriver {
  id: string;
  name: string;
  emp: string;
  plant: string;
  workgroup: string;
}

// Deliberately drawn from a range of origins: the real metro fleet is a
// diverse workforce, and a demo staffed entirely by one naming tradition
// would misrepresent it.
const GIVEN = [
  "Aaron", "Ahmed", "Amira", "Andrew", "Anh", "Anthony", "Ben", "Bianca",
  "Carlos", "Chloe", "Daniel", "Dave", "Dimitri", "Elena", "Emre", "Ethan",
  "Farid", "Grace", "Hamish", "Hannah", "Isaac", "Jack", "Jasmine", "Joel",
  "Kane", "Karan", "Kwame", "Liam", "Lucas", "Maria", "Mark", "Mateo",
  "Mehdi", "Nadia", "Nathan", "Nguyen", "Oscar", "Paul", "Priya", "Rajesh",
  "Riley", "Robert", "Sam", "Sione", "Sophie", "Stefan", "Tane", "Tariq",
  "Thomas", "Tomas", "Vince", "Wei", "Yusuf", "Zara",
];

const SURNAME = [
  "Adams", "Ahmed", "Alvarez", "Bennett", "Brooks", "Cameron", "Chen",
  "Clarke", "Costa", "Dawson", "Delgado", "Dimitriou", "Duong", "Edwards",
  "Ferreira", "Fletcher", "Gallagher", "Gill", "Hayes", "Hoang", "Ibrahim",
  "Jensen", "Kaur", "Keating", "Khan", "Lawson", "Lee", "Lombardi", "Mackay",
  "Marsh", "Mitchell", "Moreau", "Nguyen", "Novak", "Okafor", "O'Brien",
  "Pereira", "Petrov", "Quinn", "Ramsay", "Reddy", "Rivera", "Sharma",
  "Silva", "Singh", "Sullivan", "Tahir", "Taufa", "Thompson", "Tran",
  "Vasquez", "Walsh", "Whitfield", "Yilmaz",
];

/** Stable string hash (FNV-1a). Same input, same output, every run. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Invented people in place of real ones. Names are unique within the fleet
 * (the board shows a driver per truck — two identical names would look like a
 * double-assignment bug), and employee numbers become a synthetic 9xxxxx
 * series that matches nothing in the HR system.
 */
export function anonymiseDrivers<T extends AnonymisableDriver>(drivers: T[]): T[] {
  const used = new Set<string>();
  return drivers.map((d, i) => {
    // Two independent hashes, or the surname tracks the given name and the
    // fleet fills up with "Ahmed Ahmed".
    const g = hash(d.id);
    const s = hash(`${d.id}|surname`);
    let name = "";
    // Walk the pools from the hashed starting point until an unused pair
    // turns up. Bounded by GIVEN.length * SURNAME.length combinations, far
    // more than any fleet we'd seed.
    for (let attempt = 0; attempt < GIVEN.length * SURNAME.length; attempt++) {
      const given = GIVEN[(g + attempt) % GIVEN.length];
      const surname = SURNAME[(s + Math.floor(attempt / GIVEN.length)) % SURNAME.length];
      if (given === surname) continue; // both pools carry a few of the same names
      const candidate = `${given} ${surname}`;
      if (!used.has(candidate)) {
        name = candidate;
        break;
      }
    }
    if (!name) throw new Error("Ran out of invented names — widen the pools in anonymise.ts.");
    used.add(name);
    return { ...d, name, emp: String(900001 + i) };
  });
}

/** Whether this seed run should invent its people. */
export function anonymiseRequested(env: Record<string, string | undefined> = { ...process.env }): boolean {
  const raw = (env.SEED_ANONYMISE ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
